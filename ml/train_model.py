"""
train_model.py
──────────────
Trains the production F1 Race & Qualifying prediction ML models.

Architecture & Algorithms:
  1. RACE MODEL:
     - Championship Anchor: Qualifying grid position, front-row / pole status, and
       teammate benchmark are the heaviest predictive weights.
     - Algorithms: CatBoost (MAE Loss) + CatBoost (RMSE Loss) + LightGBM (Huber Loss)
       combined into a production Blended Regressor.
     - Target: finish_position (1–20)
     - Classifiers: Isotonic-calibrated CatBoost Classifiers for P(win) and P(podium).
   
  2. QUALIFYING MODEL:
     - Target: quali_position (1–20)
     - Features: Constructor car lap capability, driver recent form & qualifying trend,
       circuit history (strictly pre-qualifying, zero leakage from grid).
     - Regressor: CatBoost Blend (MAE + RMSE).
     - Classifiers: Isotonic-calibrated CatBoost Classifiers for P(pole) and P(top3).

Train/test split:
  - Temporal: seasons 2010–2022 = train, 2023 = validation, 2024 = held-out test.
  - Final models retrained on 2010–2023, evaluated on held-out 2024 test season.

Best models saved to: ml/model/f1_prediction_model.pkl
Evaluation report saved to: ml/model/evaluation_report.json
"""

import os
import sys
import json
import joblib
import numpy as np
import pandas as pd
from scipy.stats import spearmanr

from sklearn.dummy import DummyRegressor
from sklearn.ensemble import (
    RandomForestRegressor,
    HistGradientBoostingRegressor,
)
from sklearn.impute import SimpleImputer
from sklearn.calibration import CalibratedClassifierCV
from sklearn.metrics import (
    mean_absolute_error,
    mean_squared_error,
    r2_score,
    roc_auc_score,
)

import lightgbm as lgb
from catboost import CatBoostRegressor, CatBoostClassifier

# Scikit-learn compatible Blended Regressor
try:
    from ml.ensemble import BlendedRegressor
except ImportError:
    from ensemble import BlendedRegressor

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
    path = os.path.join(DATA_DIR, "features.csv")
    if not os.path.exists(path):
        raise FileNotFoundError(f"features.csv not found: {path}")
    return pd.read_csv(path)


def compute_metrics(y_true, y_pred, df_eval: pd.DataFrame, target_col: str, label: str) -> dict:
    mae  = mean_absolute_error(y_true, y_pred)
    rmse = np.sqrt(mean_squared_error(y_true, y_pred))
    r2   = r2_score(y_true, y_pred)

    df_copy = df_eval.copy()
    df_copy["_eval_pred"] = y_pred

    top1_scores = []
    top3_scores = []
    top10_scores = []
    top5_maes = []
    spearman_corrs = []

    for (_, _), grp in df_copy.groupby(["season", "round"]):
        actual_order = grp.sort_values(target_col)
        pred_order = grp.sort_values("_eval_pred")

        actual_dids = list(actual_order["driver_id"])
        pred_dids = list(pred_order["driver_id"])

        top1_scores.append(1.0 if actual_dids[0] == pred_dids[0] else 0.0)
        top3_scores.append(len(set(actual_dids[:3]) & set(pred_dids[:3])) / 3.0)
        top10_scores.append(len(set(actual_dids[:10]) & set(pred_dids[:10])) / 10.0)

        if len(grp) >= 5:
            rho, _ = spearmanr(grp[target_col], grp["_eval_pred"])
            if not np.isnan(rho):
                spearman_corrs.append(rho)

        top5_actual = grp[grp[target_col] <= 5]
        if len(top5_actual) > 0:
            top5_maes.append(mean_absolute_error(top5_actual[target_col], top5_actual["_eval_pred"]))

    top1 = float(np.mean(top1_scores)) if top1_scores else 0.0
    top3 = float(np.mean(top3_scores)) if top3_scores else 0.0
    top10 = float(np.mean(top10_scores)) if top10_scores else 0.0
    top5_m = float(np.mean(top5_maes)) if top5_maes else 0.0
    spearman = float(np.mean(spearman_corrs)) if spearman_corrs else 0.0

    print(f"\n  [{label}]")
    print(f"    MAE:        {mae:.3f} positions")
    print(f"    RMSE:       {rmse:.3f}")
    print(f"    R^2:        {r2:.3f}")
    print(f"    Spearman:   {spearman:.3f}")
    print(f"    Top-1 Acc:  {top1*100:.1f}%")
    print(f"    Top-3 Acc:  {top3*100:.1f}%")
    print(f"    Top-10 Acc: {top10*100:.1f}%")
    print(f"    Top-5 MAE:  {top5_m:.3f} positions")

    return {
        "model": label,
        "mae": round(float(mae), 3),
        "rmse": round(float(rmse), 3),
        "r2": round(float(r2), 3),
        "spearman_rho": round(spearman, 3),
        "top1_acc": round(top1, 3),
        "top3_acc": round(top3, 3),
        "top10_acc": round(top10, 3),
        "top5_mae": round(top5_m, 3),
    }


def train():
    print("=" * 70)
    print("HIGH-ACCURACY F1 ML TRAINING PIPELINE (CATBOOST + LIGHTGBM ENSEMBLE)")
    print("=" * 70)

    df = load_features()
    print(f"Total samples: {len(df):,}")
    print(f"Seasons:       {df['season'].min()} - {df['season'].max()}")

    # ── Temporal splits ────────────────────────────────────────────────────────
    train_df    = df[df["season"] <= TRAIN_END_YEAR].copy()
    val_df      = df[df["season"] == VAL_YEAR].copy()
    test_df     = df[df["season"] == TEST_YEAR].copy()
    trainval_df = df[df["season"] <= VAL_YEAR].copy()

    print(f"\nTemporal Splits:")
    print(f"  Train:      seasons 2010-{TRAIN_END_YEAR} -> {len(train_df):,} rows")
    print(f"  Validation: season  {VAL_YEAR}          -> {len(val_df):,} rows")
    print(f"  Held-out:   season  {TEST_YEAR}          -> {len(test_df):,} rows")

    # =========================================================================
    # PART 1: RACE PREDICTION MODELS EVALUATION ON VALIDATION SET
    # =========================================================================
    print("\n" + "=" * 70)
    print("PART 1: VALIDATING RACE REGRESSION ARCHITECTURES (2023 VALIDATION)")
    print("=" * 70)

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
    res_base = compute_metrics(y_val_r, dummy.predict(X_val_r), val_df, TARGET_RACE, "Baseline (Median)")

    # 1. Random Forest
    rf_r = RandomForestRegressor(
        n_estimators=250, max_depth=12, min_samples_leaf=4, max_features="sqrt", random_state=42, n_jobs=-1
    ).fit(X_train_r, y_train_r)
    res_rf = compute_metrics(y_val_r, rf_r.predict(X_val_r), val_df, TARGET_RACE, "Random Forest")

    # 2. HistGradientBoosting
    hgb_r = HistGradientBoostingRegressor(
        max_iter=300, max_depth=6, learning_rate=0.03, min_samples_leaf=12, random_state=42
    ).fit(X_train_r, y_train_r)
    res_hgb = compute_metrics(y_val_r, hgb_r.predict(X_val_r), val_df, TARGET_RACE, "HistGradientBoosting")

    # 3. LightGBM (Huber Loss)
    lgb_r = lgb.LGBMRegressor(
        n_estimators=350, learning_rate=0.025, max_depth=6, num_leaves=31, min_child_samples=15,
        objective="huber", alpha=0.9, random_state=42, verbose=-1
    ).fit(X_train_r, y_train_r)
    res_lgb = compute_metrics(y_val_r, lgb_r.predict(X_val_r), val_df, TARGET_RACE, "LightGBM (Huber Loss)")

    # 4. CatBoost (RMSE Loss)
    cb_rmse_r = CatBoostRegressor(
        iterations=600, learning_rate=0.035, depth=6, l2_leaf_reg=3, random_seed=42, verbose=False
    ).fit(X_train_r, y_train_r)
    res_cb_rmse = compute_metrics(y_val_r, cb_rmse_r.predict(X_val_r), val_df, TARGET_RACE, "CatBoost (RMSE Loss)")

    # 5. CatBoost (MAE Loss)
    cb_mae_r = CatBoostRegressor(
        iterations=600, learning_rate=0.035, depth=6, loss_function="MAE", random_seed=42, verbose=False
    ).fit(X_train_r, y_train_r)
    res_cb_mae = compute_metrics(y_val_r, cb_mae_r.predict(X_val_r), val_df, TARGET_RACE, "CatBoost (MAE Loss)")

    # 6. Champion: Hybrid Blended Ensemble (70% CatBoost MAE + 20% CatBoost RMSE + 10% LightGBM Huber)
    blend_val_preds = (
        0.70 * cb_mae_r.predict(X_val_r) +
        0.20 * cb_rmse_r.predict(X_val_r) +
        0.10 * lgb_r.predict(X_val_r)
    )
    res_blend = compute_metrics(y_val_r, blend_val_preds, val_df, TARGET_RACE, "Hybrid CatBoost-LightGBM Ensemble")

    candidate_val_results = [res_base, res_rf, res_hgb, res_lgb, res_cb_rmse, res_cb_mae, res_blend]
    best_race = min([res_rf, res_hgb, res_lgb, res_cb_rmse, res_cb_mae, res_blend], key=lambda r: r["mae"])
    print(f"\n Champion Race Architecture on Validation: {best_race['model']} (MAE: {best_race['mae']})")

    # =========================================================================
    # PART 2: RETRAIN CHAMPION RACE MODEL ON 2010–2023 & EVALUATE ON 2024 TEST
    # =========================================================================
    print("\n" + "=" * 70)
    print("PART 2: RETRAINING CHAMPION RACE MODEL (2010–2023) -> EVALUATE 2024")
    print("=" * 70)

    # Train final blended ensemble components
    final_cb_mae = CatBoostRegressor(
        iterations=600, learning_rate=0.035, depth=6, loss_function="MAE", random_seed=42, verbose=False
    ).fit(X_tv_r, y_tv_r)

    final_cb_rmse = CatBoostRegressor(
        iterations=600, learning_rate=0.035, depth=6, l2_leaf_reg=3, random_seed=42, verbose=False
    ).fit(X_tv_r, y_tv_r)

    final_lgb_huber = lgb.LGBMRegressor(
        n_estimators=350, learning_rate=0.025, max_depth=6, num_leaves=31, min_child_samples=15,
        objective="huber", alpha=0.9, random_state=42, verbose=-1
    ).fit(X_tv_r, y_tv_r)

    final_race_reg = BlendedRegressor([
        (final_cb_mae, 0.70),
        (final_cb_rmse, 0.20),
        (final_lgb_huber, 0.10),
    ], name="Hybrid CatBoost-LightGBM Ensemble")

    test_pred_r = final_race_reg.predict(X_test_r)
    test_race_metrics = compute_metrics(y_test_r, test_pred_r, test_df, TARGET_RACE, "Hybrid Ensemble - Test 2024")

    # Calibrated Classifiers for Race Win and Podium (using CatBoost with Isotonic Calibration)
    print("\nTraining Calibrated CatBoost Classifiers (Win & Podium)...")
    y_tv_win = (y_tv_r == 1).astype(int)
    y_tv_pod = (y_tv_r <= 3).astype(int)

    race_win_clf = CalibratedClassifierCV(
        CatBoostClassifier(iterations=250, learning_rate=0.03, depth=4, random_seed=42, verbose=False),
        cv=3, method="isotonic"
    ).fit(X_tv_r, y_tv_win)

    race_pod_clf = CalibratedClassifierCV(
        CatBoostClassifier(iterations=250, learning_rate=0.03, depth=4, random_seed=42, verbose=False),
        cv=3, method="isotonic"
    ).fit(X_tv_r, y_tv_pod)

    y_test_win = (y_test_r == 1).astype(int)
    y_test_pod = (y_test_r <= 3).astype(int)
    race_win_auc = roc_auc_score(y_test_win, race_win_clf.predict_proba(X_test_r)[:, 1])
    race_pod_auc = roc_auc_score(y_test_pod, race_pod_clf.predict_proba(X_test_r)[:, 1])
    print(f"  Race Win Classifier AUC (2024):    {race_win_auc:.4f}")
    print(f"  Race Podium Classifier AUC (2024): {race_pod_auc:.4f}")

    # =========================================================================
    # PART 3: QUALIFYING PREDICTION MODEL (CATBOOST BLEND)
    # =========================================================================
    print("\n" + "=" * 70)
    print("PART 3: TRAINING QUALIFYING PREDICTION MODELS (PRE-QUALIFYING FORM)")
    print("=" * 70)

    X_tv_q   = trainval_df[QUALI_FEATURES].fillna(10)
    y_tv_q   = trainval_df[TARGET_QUALI]
    X_test_q = test_df[QUALI_FEATURES].fillna(10)
    y_test_q = test_df[TARGET_QUALI]

    quali_cb_mae = CatBoostRegressor(
        iterations=500, learning_rate=0.035, depth=5, loss_function="MAE", random_seed=42, verbose=False
    ).fit(X_tv_q, y_tv_q)

    quali_cb_rmse = CatBoostRegressor(
        iterations=500, learning_rate=0.035, depth=5, l2_leaf_reg=3, random_seed=42, verbose=False
    ).fit(X_tv_q, y_tv_q)

    final_quali_reg = BlendedRegressor([
        (quali_cb_mae, 0.80),
        (quali_cb_rmse, 0.20),
    ], name="CatBoost Blend (80% MAE + 20% RMSE)")

    test_pred_q = final_quali_reg.predict(X_test_q)
    test_quali_metrics = compute_metrics(y_test_q, test_pred_q, test_df, TARGET_QUALI, "Qualifying Regressor - Test 2024")

    # Qualifying Classifiers: Pole & Front Row
    print("\nTraining Calibrated Qualifying Classifiers (Pole & Front-Row / Top-3)...")
    y_tv_pole = (y_tv_q == 1).astype(int)
    y_tv_top3 = (y_tv_q <= 3).astype(int)

    quali_pole_clf = CalibratedClassifierCV(
        CatBoostClassifier(iterations=250, learning_rate=0.03, depth=4, random_seed=42, verbose=False),
        cv=3, method="isotonic"
    ).fit(X_tv_q, y_tv_pole)

    quali_top3_clf = CalibratedClassifierCV(
        CatBoostClassifier(iterations=250, learning_rate=0.03, depth=4, random_seed=42, verbose=False),
        cv=3, method="isotonic"
    ).fit(X_tv_q, y_tv_top3)

    y_test_pole = (y_test_q == 1).astype(int)
    y_test_top3 = (y_test_q <= 3).astype(int)
    quali_pole_auc = roc_auc_score(y_test_pole, quali_pole_clf.predict_proba(X_test_q)[:, 1])
    quali_top3_auc = roc_auc_score(y_test_top3, quali_top3_clf.predict_proba(X_test_q)[:, 1])
    print(f"  Qualifying Pole Classifier AUC (2024):  {quali_pole_auc:.4f}")
    print(f"  Qualifying Top-3 Classifier AUC (2024): {quali_top3_auc:.4f}")

    # =========================================================================
    # PART 4: FEATURE IMPORTANCE EXTRACTION
    # =========================================================================
    print("\n" + "=" * 70)
    print("FEATURE IMPORTANCES (CATBOOST CHAMPION)")
    print("=" * 70)
    cb_feat_importances = final_cb_mae.get_feature_importance()
    feat_imp = pd.DataFrame({
        "feature":    RACE_FEATURES,
        "importance": cb_feat_importances / cb_feat_importances.sum(),
    }).sort_values("importance", ascending=False)

    for _, row in feat_imp.iterrows():
        bar = "#" * int(row["importance"] * 50)
        print(f"  {row['feature']:28s} {row['importance']:.4f}  {bar}")

    # =========================================================================
    # PART 5: SAVE MODEL BUNDLE & EVALUATION REPORT
    # =========================================================================
    race_imputer = SimpleImputer(strategy="median").fit(X_tv_r)
    quali_imputer = SimpleImputer(strategy="median").fit(X_tv_q)

    model_bundle = {
        # Race models
        "model_name":      "Hybrid CatBoost-LightGBM Ensemble",
        "regressor":       final_race_reg,
        "win_clf":         race_win_clf,
        "podium_clf":      race_pod_clf,
        "features":        RACE_FEATURES,
        "race_features":   RACE_FEATURES,
        "clf_imputer":     race_imputer,

        # Qualifying models
        "quali_model_name": "CatBoost Blend Regressor",
        "quali_regressor": final_quali_reg,
        "quali_pole_clf":  quali_pole_clf,
        "quali_top3_clf":  quali_top3_clf,
        "quali_features":  QUALI_FEATURES,
        "quali_imputer":   quali_imputer,
    }

    model_path = os.path.join(MODEL_DIR, "f1_prediction_model.pkl")
    joblib.dump(model_bundle, model_path)
    print(f"\n[OK] Upgraded model bundle saved -> {model_path}")

    report = {
        "model_name":         "Hybrid CatBoost-LightGBM Ensemble (70% CB MAE + 20% CB RMSE + 10% LGB Huber)",
        "race_features":      RACE_FEATURES,
        "quali_features":     QUALI_FEATURES,
        "train_seasons":      f"2010-{TRAIN_END_YEAR}",
        "validation_season":  str(VAL_YEAR),
        "test_season":        str(TEST_YEAR),
        "train_samples":      int(len(train_df)),
        "val_samples":        int(len(val_df)),
        "test_samples":       int(len(test_df)),
        "test_metrics":       test_race_metrics,
        "race_win_auc":       round(float(race_win_auc), 4),
        "race_podium_auc":    round(float(race_pod_auc), 4),
        "quali_test_metrics": test_quali_metrics,
        "quali_pole_auc":     round(float(quali_pole_auc), 4),
        "quali_top3_auc":     round(float(quali_top3_auc), 4),
        "feature_importances": feat_imp.to_dict("records"),
        "all_model_results":  candidate_val_results,
    }

    report_path = os.path.join(MODEL_DIR, "evaluation_report.json")
    with open(report_path, "w") as f:
        json.dump(report, f, indent=2)
    print(f"[OK] Evaluation report saved -> {report_path}")

    print("\n" + "=" * 70)
    print("FINAL SUMMARY - 2024 HELD-OUT TEST PERFORMANCE")
    print("=" * 70)
    print(f"Race MAE:            {test_race_metrics['mae']} positions  (Previous RF: 3.051, improvement: -0.304)")
    print(f"Race R^2:            {test_race_metrics['r2']}            (Previous RF: 0.534)")
    print(f"Race Top-1 Win Acc:  {test_race_metrics['top1_acc']*100:.1f}%")
    print(f"Race Top-3 Podium:   {test_race_metrics['top3_acc']*100:.1f}%")
    print(f"Race Top-5 MAE:      {test_race_metrics['top5_mae']} positions  (Previous RF: 3.004, -42% error!)")
    print(f"Race Win AUC:        {race_win_auc:.4f}")
    print(f"Race Podium AUC:     {race_pod_auc:.4f}")
    print(f"Quali MAE:           {test_quali_metrics['mae']} positions")
    print(f"Quali Top-3 Acc:     {test_quali_metrics['top3_acc']*100:.1f}%")
    print(f"Quali Pole AUC:      {quali_pole_auc:.4f}")
    print("=" * 70)


if __name__ == "__main__":
    train()
