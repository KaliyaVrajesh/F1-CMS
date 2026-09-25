"""
benchmark_models.py
───────────────────
Comprehensive benchmark comparing ML architectures for F1 finishing position prediction:
1. Baseline (Median)
2. HistGradientBoosting (scikit-learn)
3. Random Forest (scikit-learn)
4. XGBoost Regressor
5. LightGBM Regressor (Huber / L1 / L2 loss)
6. CatBoost Regressor
7. LightGBM Ranker (LambdaMART / NDCG ranking grouped by race)
8. Stacking / Blended Ensemble (combining top models)

Evaluated strictly on held-out 2024 season:
- MAE, RMSE, R^2
- Spearman Rank Correlation (mean per-race rho)
- Top-1 Accuracy (Winner match %)
- Top-3 Accuracy (Podium overlap %)
- Top-10 Accuracy (Points finishers overlap %)
- Top-5 MAE (Front-runner error)
"""

import os
import sys
import numpy as np
import pandas as pd
from scipy.stats import spearmanr
from sklearn.dummy import DummyRegressor
from sklearn.ensemble import RandomForestRegressor, HistGradientBoostingRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.linear_model import Ridge

DATA_DIR = os.path.join(os.path.dirname(__file__), "data")

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

TARGET_RACE = "finish_position"
TRAIN_END_YEAR = 2022
VAL_YEAR = 2023
TEST_YEAR = 2024


def load_data():
    path = os.path.join(DATA_DIR, "features.csv")
    df = pd.read_csv(path)
    train_df = df[df["season"] <= TRAIN_END_YEAR].copy()
    val_df = df[df["season"] == VAL_YEAR].copy()
    test_df = df[df["season"] == TEST_YEAR].copy()
    trainval_df = df[df["season"] <= VAL_YEAR].copy()
    return train_df, val_df, test_df, trainval_df


def evaluate_predictions(test_df: pd.DataFrame, preds: np.ndarray, model_name: str) -> dict:
    df = test_df.copy()
    df["pred"] = preds

    y_true = df[TARGET_RACE].values
    y_pred = preds

    mae = mean_absolute_error(y_true, y_pred)
    rmse = np.sqrt(mean_squared_error(y_true, y_pred))
    r2 = r2_score(y_true, y_pred)

    # Per-race metrics
    top1_scores = []
    top3_scores = []
    top10_scores = []
    spearman_corrs = []
    top5_maes = []

    for (_, _), grp in df.groupby(["season", "round"]):
        actual_order = grp.sort_values(TARGET_RACE)
        pred_order = grp.sort_values("pred")

        actual_dids = list(actual_order["driver_id"])
        pred_dids = list(pred_order["driver_id"])

        # Top 1
        top1_scores.append(1.0 if actual_dids[0] == pred_dids[0] else 0.0)

        # Top 3
        top3_scores.append(len(set(actual_dids[:3]) & set(pred_dids[:3])) / 3.0)

        # Top 10
        top10_scores.append(len(set(actual_dids[:10]) & set(pred_dids[:10])) / 10.0)

        # Spearman correlation
        if len(grp) >= 5:
            rho, _ = spearmanr(grp[TARGET_RACE], grp["pred"])
            if not np.isnan(rho):
                spearman_corrs.append(rho)

        # Top-5 actual finishers MAE
        top5_actual = grp[grp[TARGET_RACE] <= 5]
        if len(top5_actual) > 0:
            top5_maes.append(mean_absolute_error(top5_actual[TARGET_RACE], top5_actual["pred"]))

    res = {
        "model": model_name,
        "mae": round(float(mae), 4),
        "rmse": round(float(rmse), 4),
        "r2": round(float(r2), 4),
        "spearman_rho": round(float(np.mean(spearman_corrs)), 4) if spearman_corrs else 0.0,
        "top1_acc": round(float(np.mean(top1_scores)), 4) if top1_scores else 0.0,
        "top3_acc": round(float(np.mean(top3_scores)), 4) if top3_scores else 0.0,
        "top10_acc": round(float(np.mean(top10_scores)), 4) if top10_scores else 0.0,
        "top5_mae": round(float(np.mean(top5_maes)), 4) if top5_maes else 0.0,
    }
    return res


def main():
    print("=" * 70)
    print("F1 BENCHMARK: COMPARING ACCURACY OF CANDIDATE ML ARCHITECTURES")
    print("=" * 70)

    train_df, val_df, test_df, trainval_df = load_data()
    X_tv = trainval_df[RACE_FEATURES].fillna(10)
    y_tv = trainval_df[TARGET_RACE]
    X_test = test_df[RACE_FEATURES].fillna(10)
    y_test = test_df[TARGET_RACE]

    results = []

    # 1. Baseline Median
    dummy = DummyRegressor(strategy="median").fit(X_tv, y_tv)
    results.append(evaluate_predictions(test_df, dummy.predict(X_test), "Baseline (Median)"))

    # 2. Random Forest
    rf = RandomForestRegressor(
        n_estimators=250, max_depth=12, min_samples_leaf=4, max_features="sqrt", random_state=42, n_jobs=-1
    )
    rf.fit(X_tv, y_tv)
    preds_rf = rf.predict(X_test)
    results.append(evaluate_predictions(test_df, preds_rf, "Random Forest"))

    # 3. HistGradientBoosting (scikit-learn)
    hgb = HistGradientBoostingRegressor(
        max_iter=300, max_depth=6, learning_rate=0.03, min_samples_leaf=12, random_state=42
    )
    hgb.fit(X_tv, y_tv)
    preds_hgb = hgb.predict(X_test)
    results.append(evaluate_predictions(test_df, preds_hgb, "HistGradientBoosting"))

    # 4. LightGBM
    try:
        import lightgbm as lgb
        lgb_reg = lgb.LGBMRegressor(
            n_estimators=300,
            learning_rate=0.03,
            max_depth=6,
            num_leaves=31,
            min_child_samples=15,
            subsample=0.85,
            colsample_bytree=0.85,
            objective="regression",
            random_state=42,
            verbose=-1,
        )
        lgb_reg.fit(X_tv, y_tv)
        preds_lgb = lgb_reg.predict(X_test)
        results.append(evaluate_predictions(test_df, preds_lgb, "LightGBM Regressor (L2)"))

        # LightGBM Huber Loss (robust to crashes/DNFs)
        lgb_huber = lgb.LGBMRegressor(
            n_estimators=300,
            learning_rate=0.03,
            max_depth=6,
            num_leaves=31,
            min_child_samples=15,
            subsample=0.85,
            colsample_bytree=0.85,
            objective="huber",
            alpha=0.9,
            random_state=42,
            verbose=-1,
        )
        lgb_huber.fit(X_tv, y_tv)
        preds_lgb_huber = lgb_huber.predict(X_test)
        results.append(evaluate_predictions(test_df, preds_lgb_huber, "LightGBM (Huber Loss)"))

    except ImportError as e:
        print(f"LightGBM not available: {e}")

    # 5. CatBoost
    try:
        from catboost import CatBoostRegressor
        cb_reg = CatBoostRegressor(
            iterations=500,
            learning_rate=0.04,
            depth=6,
            l2_leaf_reg=3,
            random_seed=42,
            verbose=False,
        )
        cb_reg.fit(X_tv, y_tv)
        preds_cb = cb_reg.predict(X_test)
        results.append(evaluate_predictions(test_df, preds_cb, "CatBoost Regressor"))

        # CatBoost MAE
        cb_mae = CatBoostRegressor(
            iterations=500,
            learning_rate=0.04,
            depth=6,
            loss_function="MAE",
            random_seed=42,
            verbose=False,
        )
        cb_mae.fit(X_tv, y_tv)
        preds_cb_mae = cb_mae.predict(X_test)
        results.append(evaluate_predictions(test_df, preds_cb_mae, "CatBoost (MAE Loss)"))

    except ImportError as e:
        print(f"CatBoost not available: {e}")

    # 6. XGBoost
    try:
        import xgboost as xgb
        xgb_reg = xgb.XGBRegressor(
            n_estimators=300,
            learning_rate=0.03,
            max_depth=5,
            subsample=0.85,
            colsample_bytree=0.85,
            random_state=42,
            verbosity=0,
        )
        xgb_reg.fit(X_tv, y_tv)
        preds_xgb = xgb_reg.predict(X_test)
        results.append(evaluate_predictions(test_df, preds_xgb, "XGBoost Regressor"))
    except ImportError as e:
        print(f"XGBoost not available: {e}")

    # 7. LightGBM Ranker (LambdaMART / NDCG ranking grouped by race)
    try:
        import lightgbm as lgb
        # For ranking, sort trainval by season and round
        tv_sorted = trainval_df.sort_values(["season", "round"]).copy()
        test_sorted = test_df.sort_values(["season", "round"]).copy()

        # Groups are counts of drivers per race
        tv_groups = tv_sorted.groupby(["season", "round"]).size().to_numpy()
        test_groups = test_sorted.groupby(["season", "round"]).size().to_numpy()

        # Higher relevance score = better finish (21 - finish_pos)
        # 1st gets 20, 20th gets 1
        tv_relevance = (21 - tv_sorted[TARGET_RACE]).clip(lower=0).astype(int)

        X_tv_rank = tv_sorted[RACE_FEATURES].fillna(10)
        X_test_rank = test_sorted[RACE_FEATURES].fillna(10)

        ranker = lgb.LGBMRanker(
            objective="lambdarank",
            n_estimators=250,
            learning_rate=0.03,
            num_leaves=31,
            ndcg_eval_at=[1, 3, 5, 10],
            random_state=42,
            verbose=-1,
        )
        ranker.fit(
            X_tv_rank,
            tv_relevance,
            group=tv_groups,
        )
        # Predictions are relevance scores (higher = better rank)
        # To map to finish position, invert or rank within each race
        pred_scores = ranker.predict(X_test_rank)
        test_sorted["rank_score"] = pred_scores
        # Compute predicted finish position within each race from rank_score descending
        test_sorted["pred_rank_pos"] = test_sorted.groupby(["season", "round"])["rank_score"].rank(ascending=False)

        # Merge back to original test order
        pred_rank_mapped = test_df.merge(
            test_sorted[["season", "round", "driver_id", "pred_rank_pos"]],
            on=["season", "round", "driver_id"],
            how="left"
        )["pred_rank_pos"].values

        results.append(evaluate_predictions(test_df, pred_rank_mapped, "LightGBM LambdaMART Ranker"))
    except Exception as e:
        print(f"Ranking model error: {e}")

    # 8. Blended Stacking Meta-Ensemble
    # Combine predictions from top diverse models
    try:
        blend_candidates = []
        if 'preds_lgb' in locals():
            blend_candidates.append(("lgb", preds_lgb))
        if 'preds_cb' in locals():
            blend_candidates.append(("catboost", preds_cb))
        if 'preds_rf' in locals():
            blend_candidates.append(("rf", preds_rf))
        if 'preds_xgb' in locals():
            blend_candidates.append(("xgb", preds_xgb))
        if 'preds_lgb_huber' in locals():
            blend_candidates.append(("lgb_huber", preds_lgb_huber))

        if len(blend_candidates) >= 3:
            # Simple weighted average: 30% CatBoost, 30% LightGBM Huber, 20% XGBoost, 20% Random Forest
            preds_blend = (
                0.35 * preds_lgb_huber +
                0.30 * preds_cb +
                0.20 * preds_rf +
                0.15 * preds_xgb
            )
            results.append(evaluate_predictions(test_df, preds_blend, "Blended Ensemble (LGB+CB+RF+XGB)"))

            # Stacking with Ridge Meta-Learner (trained on val_df predictions)
            X_val = val_df[RACE_FEATURES].fillna(10)
            y_val = val_df[TARGET_RACE]
            val_p_lgb = lgb_huber.predict(X_val)
            val_p_cb = cb_reg.predict(X_val)
            val_p_rf = rf.predict(X_val)
            val_p_xgb = xgb_reg.predict(X_val)

            val_meta_X = np.column_stack([val_p_lgb, val_p_cb, val_p_rf, val_p_xgb])
            test_meta_X = np.column_stack([preds_lgb_huber, preds_cb, preds_rf, preds_xgb])

            ridge_meta = Ridge(alpha=1.0, positive=True)
            ridge_meta.fit(val_meta_X, y_val)
            preds_stack = ridge_meta.predict(test_meta_X)
            results.append(evaluate_predictions(test_df, preds_stack, "Stacking Meta-Regressor (Ridge)"))
    except Exception as e:
        print(f"Stacking error: {e}")

    # Output benchmark table
    res_df = pd.DataFrame(results).sort_values("mae")
    print("\n" + "=" * 95)
    print(f"{'Model':<34} | {'MAE':<6} | {'RMSE':<6} | {'R2':<6} | {'Spearman':<8} | {'Top-1':<6} | {'Top-3':<6} | {'Top-10':<6} | {'Top-5 MAE':<9}")
    print("-" * 95)
    for _, r in res_df.iterrows():
        print(f"{r['model']:<34} | {r['mae']:<6.3f} | {r['rmse']:<6.3f} | {r['r2']:<6.3f} | {r['spearman_rho']:<8.3f} | {r['top1_acc']*100:<5.1f}% | {r['top3_acc']*100:<5.1f}% | {r['top10_acc']*100:<5.1f}% | {r['top5_mae']:<9.3f}")
    print("=" * 95)


if __name__ == "__main__":
    main()
