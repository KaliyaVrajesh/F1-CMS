"""
train_model.py
──────────────
Trains the F1 Race & Qualifying prediction ML models.

Architecture:
  1. RACE MODEL:
     - Target: finish_position (1–20)
     - Core Features: Starting grid position & qualifying metrics (heaviest predictors),
       teammate & car pace benchmark, current-season rolling form (capturing in-season upgrades),
       and regulation-aware decay on prior season points.
     - Calibrated Classifiers: Race Win P(win) and Podium P(podium).
  
  2. QUALIFYING MODEL:
     - Target: quali_position (1–20)
     - Core Features: Constructor pace (car lap capability), driver recent form & qualifying strength,
       circuit history (strictly pre-qualifying, zero leakage from grid).
     - Calibrated Classifiers: Pole Position P(pole) and Front-row / Top-3 P(top3).

Train/test split:
  - Temporal: seasons 2010–2022 = train, 2023 = validation, 2024 = test.
  - Final models retrained on 2010–2023, evaluated on held-out 2024 test season.

Best models saved to: ml/model/f1_prediction_model.pkl
Evaluation report saved to: ml/model/evaluation_report.json
"""

import os
import json
import joblib
import numpy as np
import pandas as pd

from sklearn.dummy import DummyRegressor
from sklearn.ensemble import (
    RandomForestRegressor,
    GradientBoostingRegressor,
    HistGradientBoostingRegressor,
    VotingRegressor,
    GradientBoostingClassifier,
    HistGradientBoostingClassifier,
)
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.impute import SimpleImputer
from sklearn.calibration import CalibratedClassifierCV
from sklearn.metrics import (
    mean_absolute_error,
    mean_squared_error,
    r2_score,
    roc_auc_score,
)

DATA_DIR  = os.path.join(os.path.dirname(__file__), "data")
MODEL_DIR = os.path.join(os.path.dirname(__file__), "model")
os.makedirs(MODEL_DIR, exist_ok=True)

RACE_FEATURES = [
    "grid_position",
    "team_best_grid",
    "grid_vs_team_best",
    "is_pole",
    "is_front_row",
    "is_top3_grid",
    "is_top6_grid",
    "grid_inv",
    "constr_avg_finish_l5",
    "driver_avg_finish_l5",
    "driver_avg_finish_l10",
    "form_trend",
    "driver_dnf_rate_l10",
    "circuit_avg_finish",
    "circuit_appearances",
    "circuit_podium_rate",
    "constr_prev_pts_decayed",
    "driver_prev_pts_decayed",
    "season_round",
    "is_new_reg_era",
]

QUALI_FEATURES = [
    "constr_avg_finish_l5",
    "driver_avg_finish_l5",
    "driver_avg_finish_l10",
    "form_trend",
    "circuit_avg_finish",
    "circuit_appearances",
    "circuit_podium_rate",
    "constr_prev_pts_decayed",
    "driver_prev_pts_decayed",
    "is_new_reg_era",
    "season_round",
]

TARGET_RACE  = "finish_position"
TARGET_QUALI = "quali_position"

TRAIN_END_YEAR = 2022
VAL_YEAR       = 2023
TEST_YEAR      = 2024


def load_features() -> pd.DataFrame:
    path = f"{DATA_DIR}/features.csv"
    if not os.path.exists(path):
        raise FileNotFoundError(f"features.csv not found: {path}")
    return pd.read_csv(path)


def evaluate_regression(y_true, y_pred, label: str) -> dict:
    mae  = mean_absolute_error(y_true, y_pred)
    rmse = np.sqrt(mean_squared_error(y_true, y_pred))
    r2   = r2_score(y_true, y_pred)
    print(f"\n  [{label}]")
    print(f"    MAE:  {mae:.3f}")
    print(f"    RMSE: {rmse:.3f}")
    print(f"    R^2:  {r2:.3f}")
    return {"model": label, "mae": round(float(mae), 3), "rmse": round(float(rmse), 3), "r2": round(float(r2), 3)}


def top3_accuracy(df_subset: pd.DataFrame, pred_col: str, target_col: str = "finish_position") -> float:
    scores = []
    for (_, _), grp in df_subset.groupby(["season", "round"]):
        actual_top3 = set(grp.nsmallest(3, target_col)["driver_id"])
        pred_top3   = set(grp.nsmallest(3, pred_col)["driver_id"])
        overlap     = len(actual_top3 & pred_top3)
        scores.append(overlap / 3.0)
    return float(np.mean(scores)) if scores else 0.0


def train():
    print("=" * 60)
    print("F1 ENHANCED ML TRAINING PIPELINE (RACE & QUALIFYING)")
    print("=" * 60)

    df = load_features()
    print(f"Total samples: {len(df)}")
    print(f"Seasons:       {df['season'].min()} - {df['season'].max()}")

    # ── Temporal splits ────────────────────────────────────────────────────────
    train_df    = df[df["season"] <= TRAIN_END_YEAR].copy()
    val_df      = df[df["season"] == VAL_YEAR].copy()
    test_df     = df[df["season"] == TEST_YEAR].copy()
    trainval_df = df[df["season"] <= VAL_YEAR].copy()

    print(f"\nTemporal Splits:")
    print(f"  Train:      seasons 2010-{TRAIN_END_YEAR} -> {len(train_df):,} rows")
    print(f"  Validation: season  {VAL_YEAR}          -> {len(val_df):,} rows")
    print(f"  Test:       season  {TEST_YEAR}          -> {len(test_df):,} rows")

    # =========================================================================
    # PART 1: RACE PREDICTION MODEL
    # =========================================================================
    print("\n" + "=" * 60)
    print("PART 1: TRAINING RACE PREDICTION MODELS")
    print("=" * 60)

    X_train_r = train_df[RACE_FEATURES].fillna(10)
    y_train_r = train_df[TARGET_RACE]
    X_val_r   = val_df[RACE_FEATURES].fillna(10)
    y_val_r   = val_df[TARGET_RACE]
    X_tv_r    = trainval_df[RACE_FEATURES].fillna(10)
    y_tv_r    = trainval_df[TARGET_RACE]
    X_test_r  = test_df[RACE_FEATURES].fillna(10)
    y_test_r  = test_df[TARGET_RACE]

    # Baseline
    dummy = DummyRegressor(strategy="median").fit(X_train_r, y_train_r)
    res_base = evaluate_regression(y_val_r, dummy.predict(X_val_r), "Baseline (Median)")

    # HistGradientBoosting
    hgb_r = HistGradientBoostingRegressor(
        max_iter=250, max_depth=6, learning_rate=0.035, min_samples_leaf=12, random_state=42
    )
    hgb_r.fit(X_train_r, y_train_r)
    val_pred_hgb = hgb_r.predict(X_val_r)
    res_hgb = evaluate_regression(y_val_r, val_pred_hgb, "HistGradientBoosting")
    val_df_copy = val_df.copy()
    val_df_copy["pred_hgb"] = val_pred_hgb
    res_hgb["top3_accuracy"] = round(top3_accuracy(val_df_copy, "pred_hgb"), 3)
    print(f"    Top-3 Accuracy: {res_hgb['top3_accuracy']:.3f}")

    # Random Forest
    rf_r = RandomForestRegressor(
        n_estimators=200, max_depth=12, min_samples_leaf=5, max_features="sqrt", random_state=42, n_jobs=-1
    )
    rf_r.fit(X_train_r, y_train_r)
    val_pred_rf = rf_r.predict(X_val_r)
    res_rf = evaluate_regression(y_val_r, val_pred_rf, "Random Forest")
    val_df_copy["pred_rf"] = val_pred_rf
    res_rf["top3_accuracy"] = round(top3_accuracy(val_df_copy, "pred_rf"), 3)
    print(f"    Top-3 Accuracy: {res_rf['top3_accuracy']:.3f}")

    # Gradient Boosting
    gb_r = GradientBoostingRegressor(
        n_estimators=250, max_depth=5, learning_rate=0.04, subsample=0.8, min_samples_leaf=8, random_state=42
    )
    gb_r.fit(X_train_r, y_train_r)
    val_pred_gb = gb_r.predict(X_val_r)
    res_gb = evaluate_regression(y_val_r, val_pred_gb, "Gradient Boosting")
    val_df_copy["pred_gb"] = val_pred_gb
    res_gb["top3_accuracy"] = round(top3_accuracy(val_df_copy, "pred_gb"), 3)
    print(f"    Top-3 Accuracy: {res_gb['top3_accuracy']:.3f}")

    # Ensemble: Voting Regressor
    ensemble_r = VotingRegressor([
        ("hgb", HistGradientBoostingRegressor(max_iter=250, max_depth=6, learning_rate=0.035, min_samples_leaf=12, random_state=42)),
        ("gb",  GradientBoostingRegressor(n_estimators=250, max_depth=5, learning_rate=0.04, subsample=0.8, min_samples_leaf=8, random_state=42)),
        ("rf",  RandomForestRegressor(n_estimators=200, max_depth=12, min_samples_leaf=5, max_features="sqrt", random_state=42, n_jobs=-1)),
    ])
    ensemble_r.fit(X_train_r, y_train_r)
    val_pred_ens = ensemble_r.predict(X_val_r)
    res_ens = evaluate_regression(y_val_r, val_pred_ens, "Ensemble (Voting Regressor)")
    val_df_copy["pred_ens"] = val_pred_ens
    res_ens["top3_accuracy"] = round(top3_accuracy(val_df_copy, "pred_ens"), 3)
    print(f"    Top-3 Accuracy: {res_ens['top3_accuracy']:.3f}")

    # Select best race regressor on val MAE
    all_race_results = [res_base, res_hgb, res_rf, res_gb, res_ens]
    best_race = min([res_hgb, res_rf, res_gb, res_ens], key=lambda r: r["mae"])
    print(f"\n-> Best Race Model on Validation: {best_race['model']}")

    # Retrain best race regressor on trainval (2010–2023), evaluate on 2024 test
    if best_race["model"] == "Ensemble (Voting Regressor)":
        final_race_reg = ensemble_r
    elif best_race["model"] == "HistGradientBoosting":
        final_race_reg = hgb_r
    elif best_race["model"] == "Gradient Boosting":
        final_race_reg = gb_r
    else:
        final_race_reg = rf_r

    final_race_reg.fit(X_tv_r, y_tv_r)
    test_pred_r = final_race_reg.predict(X_test_r)
    test_race_metrics = evaluate_regression(y_test_r, test_pred_r, f"{best_race['model']} - Test 2024")
    test_df_copy = test_df.copy()
    test_df_copy["pred_race"] = test_pred_r
    test_race_metrics["top3_accuracy"] = round(top3_accuracy(test_df_copy, "pred_race"), 3)
    print(f"    Top-3 Accuracy: {test_race_metrics['top3_accuracy']:.3f}")

    # Race Classifiers: Calibrated for Win and Podium
    print("\nTraining Race Calibrated Classifiers (Win & Podium)...")
    y_tv_win = (y_tv_r == 1).astype(int)
    y_tv_pod = (y_tv_r <= 3).astype(int)

    race_win_clf = CalibratedClassifierCV(
        HistGradientBoostingClassifier(max_iter=150, max_depth=4, learning_rate=0.03, random_state=42),
        cv=3, method="isotonic"
    )
    race_win_clf.fit(X_tv_r, y_tv_win)

    race_pod_clf = CalibratedClassifierCV(
        HistGradientBoostingClassifier(max_iter=150, max_depth=4, learning_rate=0.03, random_state=42),
        cv=3, method="isotonic"
    )
    race_pod_clf.fit(X_tv_r, y_tv_pod)

    # Evaluate Race AUCs on 2024
    y_test_win = (y_test_r == 1).astype(int)
    y_test_pod = (y_test_r <= 3).astype(int)
    race_win_auc = roc_auc_score(y_test_win, race_win_clf.predict_proba(X_test_r)[:, 1])
    race_pod_auc = roc_auc_score(y_test_pod, race_pod_clf.predict_proba(X_test_r)[:, 1])
    print(f"  Race Win Classifier AUC (2024):    {race_win_auc:.3f}")
    print(f"  Race Podium Classifier AUC (2024): {race_pod_auc:.3f}")

    # =========================================================================
    # PART 2: QUALIFYING PREDICTION MODEL
    # =========================================================================
    print("\n" + "=" * 60)
    print("PART 2: TRAINING QUALIFYING PREDICTION MODELS")
    print("=" * 60)

    X_tv_q   = trainval_df[QUALI_FEATURES].fillna(10)
    y_tv_q   = trainval_df[TARGET_QUALI]
    X_test_q = test_df[QUALI_FEATURES].fillna(10)
    y_test_q = test_df[TARGET_QUALI]

    # Qualifying Regressor
    final_quali_reg = HistGradientBoostingRegressor(
        max_iter=250, max_depth=5, learning_rate=0.04, min_samples_leaf=10, random_state=42
    )
    final_quali_reg.fit(X_tv_q, y_tv_q)
    test_pred_q = final_quali_reg.predict(X_test_q)
    test_quali_metrics = evaluate_regression(y_test_q, test_pred_q, "Qualifying Regressor - Test 2024")
    test_df_copy["pred_quali"] = test_pred_q
    test_quali_metrics["top3_accuracy"] = round(top3_accuracy(test_df_copy, "pred_quali", TARGET_QUALI), 3)
    print(f"    Top-3 Accuracy: {test_quali_metrics['top3_accuracy']:.3f}")

    # Qualifying Classifiers: Pole & Top 3
    print("\nTraining Qualifying Calibrated Classifiers (Pole & Top-3)...")
    y_tv_pole = (y_tv_q == 1).astype(int)
    y_tv_top3 = (y_tv_q <= 3).astype(int)

    quali_pole_clf = CalibratedClassifierCV(
        HistGradientBoostingClassifier(max_iter=150, max_depth=4, learning_rate=0.03, random_state=42),
        cv=3, method="isotonic"
    )
    quali_pole_clf.fit(X_tv_q, y_tv_pole)

    quali_top3_clf = CalibratedClassifierCV(
        HistGradientBoostingClassifier(max_iter=150, max_depth=4, learning_rate=0.03, random_state=42),
        cv=3, method="isotonic"
    )
    quali_top3_clf.fit(X_tv_q, y_tv_top3)

    y_test_pole = (y_test_q == 1).astype(int)
    y_test_top3 = (y_test_q <= 3).astype(int)
    quali_pole_auc = roc_auc_score(y_test_pole, quali_pole_clf.predict_proba(X_test_q)[:, 1])
    quali_top3_auc = roc_auc_score(y_test_top3, quali_top3_clf.predict_proba(X_test_q)[:, 1])
    print(f"  Qualifying Pole Classifier AUC (2024):  {quali_pole_auc:.3f}")
    print(f"  Qualifying Top-3 Classifier AUC (2024): {quali_top3_auc:.3f}")

    # =========================================================================
    # PART 3: FEATURE IMPORTANCE
    # =========================================================================
    print("\n" + "=" * 60)
    print("FEATURE IMPORTANCES (RACE MODEL)")
    print("=" * 60)
    # Train a single RandomForest to extract clean Gini feature importances
    rf_feat = RandomForestRegressor(n_estimators=150, max_depth=10, random_state=42, n_jobs=-1)
    rf_feat.fit(X_tv_r, y_tv_r)
    feat_imp = pd.DataFrame({
        "feature":    RACE_FEATURES,
        "importance": rf_feat.feature_importances_,
    }).sort_values("importance", ascending=False)

    for _, row in feat_imp.iterrows():
        bar = "#" * int(row["importance"] * 50)
        print(f"  {row['feature']:28s} {row['importance']:.4f}  {bar}")

    # =========================================================================
    # PART 4: SAVE MODEL BUNDLE & EVALUATION REPORT
    # =========================================================================
    race_imputer = SimpleImputer(strategy="median").fit(X_tv_r)
    quali_imputer = SimpleImputer(strategy="median").fit(X_tv_q)

    model_bundle = {
        # Race models
        "regressor":       final_race_reg,
        "win_clf":         race_win_clf,
        "podium_clf":      race_pod_clf,
        "features":        RACE_FEATURES,
        "race_features":   RACE_FEATURES,
        "clf_imputer":     race_imputer,

        # Qualifying models
        "quali_regressor": final_quali_reg,
        "quali_pole_clf":  quali_pole_clf,
        "quali_top3_clf":  quali_top3_clf,
        "quali_features":  QUALI_FEATURES,
        "quali_imputer":   quali_imputer,
    }

    model_path = f"{MODEL_DIR}/f1_prediction_model.pkl"
    joblib.dump(model_bundle, model_path)
    print(f"\n[OK] Model bundle saved -> {model_path}")

    report = {
        "model_name":         best_race["model"],
        "race_features":      RACE_FEATURES,
        "quali_features":     QUALI_FEATURES,
        "train_seasons":      f"2010-{TRAIN_END_YEAR}",
        "validation_season":  str(VAL_YEAR),
        "test_season":        str(TEST_YEAR),
        "train_samples":      int(len(train_df)),
        "val_samples":        int(len(val_df)),
        "test_samples":       int(len(test_df)),
        "test_metrics":       test_race_metrics,
        "race_win_auc":       round(float(race_win_auc), 3),
        "race_podium_auc":    round(float(race_pod_auc), 3),
        "quali_test_metrics": test_quali_metrics,
        "quali_pole_auc":     round(float(quali_pole_auc), 3),
        "quali_top3_auc":     round(float(quali_top3_auc), 3),
        "feature_importances": feat_imp.to_dict("records"),
        "all_model_results":  all_race_results,
    }

    report_path = f"{MODEL_DIR}/evaluation_report.json"
    with open(report_path, "w") as f:
        json.dump(report, f, indent=2)
    print(f"[OK] Evaluation report saved -> {report_path}")

    print("\n" + "=" * 60)
    print("FINAL SUMMARY")
    print("=" * 60)
    print(f"Race Test MAE:       {test_race_metrics['mae']} positions")
    print(f"Race Test R^2:       {test_race_metrics['r2']}")
    print(f"Race Top-3 Accuracy: {test_race_metrics['top3_accuracy']}")
    print(f"Race Win AUC:        {race_win_auc:.3f}")
    print(f"Quali Test MAE:      {test_quali_metrics['mae']} positions")
    print(f"Quali Pole AUC:      {quali_pole_auc:.3f}")


if __name__ == "__main__":
    train()
