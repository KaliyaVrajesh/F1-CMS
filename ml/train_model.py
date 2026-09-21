"""
train_model.py
──────────────
Trains the F1 race prediction ML models.

Strategy:
  - Target: finish_position (regression, predicts expected finishing position 1–20)
  - Additional derived outputs: winner probability, podium probability
    (computed from predicted positions + calibrated via CalibratedClassifierCV)

Train/test split:
  - TEMPORAL: seasons 2010–2022 = training, 2023 = validation, 2024 = test
  - This mirrors real-world usage (predict forward, never backward)
  - No random shuffling across seasons to prevent leakage

Models compared:
  1. Baseline — DummyRegressor (median)
  2. Random Forest Regressor
  3. Gradient Boosting Regressor

Evaluation metrics (regression):
  - MAE, RMSE, R²
  - Top-3 accuracy (did model predict the actual top 3 correctly?)

Best model is saved to ml/model/f1_prediction_model.pkl
"""

import pandas as pd
import numpy as np
import os
import json
import joblib

from sklearn.dummy import DummyRegressor
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.impute import SimpleImputer
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.calibration import CalibratedClassifierCV
from sklearn.ensemble import GradientBoostingClassifier

DATA_DIR  = os.path.join(os.path.dirname(__file__), "data")
MODEL_DIR = os.path.join(os.path.dirname(__file__), "model")
os.makedirs(MODEL_DIR, exist_ok=True)

# Feature columns — all pre-race, no leakage
FEATURES = [
    "grid_position",
    "quali_position",
    "driver_prev_season_pts",
    "driver_prev_season_pos",
    "driver_prev_season_wins",
    "constr_prev_season_pts",
    "constr_prev_season_pos",
    "constr_prev_season_wins",
    "driver_avg_finish_l5",
    "driver_avg_finish_l10",
    "driver_dnf_rate_l10",
    "constr_avg_finish_l5",
    "circuit_avg_finish",
    "circuit_appearances",
    "circuit_podium_rate",
    "season_round",
    "season_year",
]
TARGET = "finish_position"

# Temporal split boundaries
TRAIN_END_YEAR  = 2022
VAL_YEAR        = 2023
TEST_YEAR       = 2024


def load_features() -> pd.DataFrame:
    path = f"{DATA_DIR}/features.csv"
    if not os.path.exists(path):
        raise FileNotFoundError(
            f"features.csv not found. Run feature_engineering.py first.\n"
            f"  Expected: {path}"
        )
    return pd.read_csv(path)


def build_regression_pipeline(model) -> Pipeline:
    """Wrap any regressor with imputation + scaling."""
    return Pipeline([
        ("imputer", SimpleImputer(strategy="median")),
        ("scaler",  StandardScaler()),
        ("model",   model),
    ])


def evaluate_regression(y_true, y_pred, label: str) -> dict:
    mae  = mean_absolute_error(y_true, y_pred)
    rmse = np.sqrt(mean_squared_error(y_true, y_pred))
    r2   = r2_score(y_true, y_pred)
    print(f"\n  [{label}]")
    print(f"    MAE:  {mae:.3f}")
    print(f"    RMSE: {rmse:.3f}")
    print(f"    R²:   {r2:.3f}")
    return {"model": label, "mae": round(mae, 3), "rmse": round(rmse, 3), "r2": round(r2, 3)}


def top3_accuracy(df_subset: pd.DataFrame, pred_col: str) -> float:
    """
    Per-race: what fraction of actual top-3 finishers were in the
    model's predicted top-3? Averaged across all races.
    """
    scores = []
    for (season, round_num), grp in df_subset.groupby(["season", "round"]):
        actual_top3   = set(grp.nsmallest(3, "finish_position")["driver_id"])
        pred_top3     = set(grp.nsmallest(3, pred_col)["driver_id"])
        overlap       = len(actual_top3 & pred_top3)
        scores.append(overlap / 3.0)
    return float(np.mean(scores))


def train() -> None:
    print("=" * 60)
    print("F1 ML TRAINING PIPELINE")
    print("=" * 60)

    # ── 1. Load data ──────────────────────────────────────────────────────────
    df = load_features()
    print(f"\nTotal samples: {len(df)}")
    print(f"Seasons:       {df['season'].min()} – {df['season'].max()}")

    # ── 2. Temporal split ─────────────────────────────────────────────────────
    train_df = df[df["season"] <= TRAIN_END_YEAR].copy()
    val_df   = df[df["season"] == VAL_YEAR].copy()
    test_df  = df[df["season"] == TEST_YEAR].copy()

    print(f"\nTemporal Split:")
    print(f"  Train:      seasons 2010–{TRAIN_END_YEAR}  → {len(train_df):,} rows")
    print(f"  Validation: season  {VAL_YEAR}           → {len(val_df):,} rows")
    print(f"  Test:       season  {TEST_YEAR}           → {len(test_df):,} rows")

    # Combine train + val for final model training after selection
    trainval_df = df[df["season"] <= VAL_YEAR].copy()

    X_train, y_train = train_df[FEATURES], train_df[TARGET]
    X_val,   y_val   = val_df[FEATURES],   val_df[TARGET]
    X_test,  y_test  = test_df[FEATURES],  test_df[TARGET]
    X_trainval       = trainval_df[FEATURES]
    y_trainval       = trainval_df[TARGET]

    # ── 3. Baseline model ─────────────────────────────────────────────────────
    print("\n── Model Evaluation (Validation set: 2023) ──────────────────")
    baseline = build_regression_pipeline(DummyRegressor(strategy="median"))
    baseline.fit(X_train, y_train)
    baseline_pred = baseline.predict(X_val)
    results_baseline = evaluate_regression(y_val, baseline_pred, "Baseline (Median)")

    # ── 4. Random Forest ─────────────────────────────────────────────────────
    rf = build_regression_pipeline(
        RandomForestRegressor(
            n_estimators=200,
            max_depth=12,
            min_samples_leaf=5,
            max_features="sqrt",
            random_state=42,
            n_jobs=-1,
        )
    )
    rf.fit(X_train, y_train)
    rf_val_pred = rf.predict(X_val)
    results_rf = evaluate_regression(y_val, rf_val_pred, "Random Forest")

    val_df = val_df.copy()
    val_df["pred_pos_rf"] = rf_val_pred
    rf_top3 = top3_accuracy(val_df, "pred_pos_rf")
    print(f"    Top-3 Accuracy: {rf_top3:.3f}")
    results_rf["top3_accuracy"] = round(rf_top3, 3)

    # ── 5. Gradient Boosting ─────────────────────────────────────────────────
    gb = build_regression_pipeline(
        GradientBoostingRegressor(
            n_estimators=300,
            max_depth=5,
            learning_rate=0.05,
            subsample=0.8,
            min_samples_leaf=5,
            random_state=42,
        )
    )
    gb.fit(X_train, y_train)
    gb_val_pred = gb.predict(X_val)
    results_gb = evaluate_regression(y_val, gb_val_pred, "Gradient Boosting")

    val_df["pred_pos_gb"] = gb_val_pred
    gb_top3 = top3_accuracy(val_df, "pred_pos_gb")
    print(f"    Top-3 Accuracy: {gb_top3:.3f}")
    results_gb["top3_accuracy"] = round(gb_top3, 3)

    # ── 6. Choose best model (by MAE on validation) ────────────────────────────
    all_results = [results_baseline, results_rf, results_gb]
    best = min([results_rf, results_gb], key=lambda r: r["mae"])
    best_label = best["model"]
    best_model  = rf if best_label == "Random Forest" else gb
    print(f"\n→ Best model (lowest val MAE): {best_label}")

    # ── 7. Re-train best model on train+val, evaluate on held-out 2024 test ──
    print(f"\n── Final Model (retrained on 2010–{VAL_YEAR}, tested on {TEST_YEAR}) ──")
    best_model.fit(X_trainval, y_trainval)
    test_pred = best_model.predict(X_test)
    results_test = evaluate_regression(y_test, test_pred, f"{best_label} — Test 2024")

    test_df = test_df.copy()
    test_df["pred_pos"] = test_pred
    test_top3 = top3_accuracy(test_df, "pred_pos")
    print(f"    Top-3 Accuracy: {test_top3:.3f}")
    results_test["top3_accuracy"] = round(test_top3, 3)

    # ── 8. Train podium / win classifiers for probability outputs ─────────────
    # Podium classifier: position 1-3 = 1
    print("\n── Training Podium & Win Probability Classifiers ─────────────")
    trainval_podium = (y_trainval <= 3).astype(int)
    trainval_win    = (y_trainval == 1).astype(int)

    X_tv_imputed = SimpleImputer(strategy="median").fit_transform(X_trainval)

    podium_clf = CalibratedClassifierCV(
        GradientBoostingClassifier(
            n_estimators=200, max_depth=4,
            learning_rate=0.05, subsample=0.8,
            random_state=42,
        ),
        cv=3, method="isotonic"
    )
    podium_clf.fit(X_tv_imputed, trainval_podium)
    print("  ✓ Podium classifier trained (CalibratedCV)")

    win_clf = CalibratedClassifierCV(
        GradientBoostingClassifier(
            n_estimators=200, max_depth=4,
            learning_rate=0.05, subsample=0.8,
            random_state=42,
        ),
        cv=3, method="isotonic"
    )
    win_clf.fit(X_tv_imputed, trainval_win)
    print("  ✓ Win classifier trained (CalibratedCV)")

    # Shared imputer for classifiers at inference time
    clf_imputer = SimpleImputer(strategy="median").fit(X_trainval)

    # Evaluate classifiers on test set
    X_test_imp  = clf_imputer.transform(X_test)
    test_podium = (y_test <= 3).astype(int)
    test_win    = (y_test == 1).astype(int)

    from sklearn.metrics import roc_auc_score, accuracy_score
    try:
        podium_auc = roc_auc_score(test_podium, podium_clf.predict_proba(X_test_imp)[:, 1])
        win_auc    = roc_auc_score(test_win,    win_clf.predict_proba(X_test_imp)[:, 1])
        print(f"  Podium Classifier AUC (2024 test): {podium_auc:.3f}")
        print(f"  Win Classifier AUC   (2024 test): {win_auc:.3f}")
    except Exception as exc:
        print(f"  AUC computation note: {exc}")
        podium_auc, win_auc = None, None

    # ── 9. Feature importance ─────────────────────────────────────────────────
    # Extract from the inner estimator of the best pipeline
    inner_model = best_model.named_steps["model"]
    if hasattr(inner_model, "feature_importances_"):
        importances = inner_model.feature_importances_
        feat_imp = pd.DataFrame({
            "feature":    FEATURES,
            "importance": importances,
        }).sort_values("importance", ascending=False)
        print("\n── Feature Importances ────────────────────────────────────────")
        for _, row in feat_imp.iterrows():
            bar = "█" * int(row["importance"] * 50)
            print(f"  {row['feature']:30s} {row['importance']:.4f}  {bar}")

    # ── 10. Save model bundle ─────────────────────────────────────────────────
    model_bundle = {
        "regressor":   best_model,      # full Pipeline (imputer + scaler + model)
        "podium_clf":  podium_clf,       # CalibratedClassifierCV for P(podium)
        "win_clf":     win_clf,          # CalibratedClassifierCV for P(win)
        "clf_imputer": clf_imputer,      # SimpleImputer for classifiers
        "features":    FEATURES,
        "target":      TARGET,
    }
    model_path = f"{MODEL_DIR}/f1_prediction_model.pkl"
    joblib.dump(model_bundle, model_path)
    print(f"\n✅ Model bundle saved → {model_path}")

    # ── 11. Save evaluation report ────────────────────────────────────────────
    report = {
        "model_name":         best_label,
        "features":           FEATURES,
        "target":             TARGET,
        "train_seasons":      f"2010–{TRAIN_END_YEAR}",
        "validation_season":  str(VAL_YEAR),
        "test_season":        str(TEST_YEAR),
        "train_samples":      int(len(train_df)),
        "val_samples":        int(len(val_df)),
        "test_samples":       int(len(test_df)),
        "validation_metrics": {k: v for k, v in results_rf.items() if best_label == "Random Forest"} if best_label == "Random Forest" else {k: v for k, v in results_gb.items()},
        "test_metrics":       results_test,
        "baseline_val_mae":   results_baseline["mae"],
        "podium_clf_auc":     round(float(podium_auc), 3) if podium_auc is not None else "N/A",
        "win_clf_auc":        round(float(win_auc), 3)    if win_auc    is not None else "N/A",
        "all_model_results":  all_results,
    }
    if hasattr(inner_model, "feature_importances_"):
        report["feature_importances"] = feat_imp.to_dict("records")

    report_path = f"{MODEL_DIR}/evaluation_report.json"
    with open(report_path, "w") as f:
        json.dump(report, f, indent=2)
    print(f"✅ Evaluation report saved → {report_path}")

    # ── 12. Print final summary ───────────────────────────────────────────────
    print("\n" + "=" * 60)
    print("FINAL EVALUATION SUMMARY")
    print("=" * 60)
    print(f"\nModel:              {best_label}")
    print(f"Train samples:      {len(trainval_df):,}")
    print(f"Test samples:       {len(test_df):,}")
    print(f"Test MAE:           {results_test['mae']}")
    print(f"Test RMSE:          {results_test['rmse']}")
    print(f"Test R²:            {results_test['r2']}")
    print(f"Top-3 accuracy:     {results_test['top3_accuracy']}")
    print(f"Podium clf AUC:     {round(float(podium_auc), 3) if podium_auc else 'N/A'}")
    print(f"Win    clf AUC:     {round(float(win_auc),    3) if win_auc    else 'N/A'}")
    print(f"\nBaseline MAE (median): {results_baseline['mae']}")
    print(f"Improvement vs baseline: {results_baseline['mae'] - results_test['mae']:.3f} positions")


if __name__ == "__main__":
    train()
