"""
feature_engineering.py
───────────────────────
Builds the ML-ready feature matrix from raw collected data.

Features (strictly pre-race or pre-qualifying — zero data leakage):
  - Starting grid & qualifying metrics (heaviest predictors of race outcomes)
  - Teammate & car pace benchmark (team_best_grid, grid_vs_team_best)
  - Current-season rolling form for drivers and constructors (captures in-season upgrades)
  - Regulation-aware decay on prior season points (prevents obsolete standings from dominating)
  - Circuit history & reliability

Target:
  - finish_position (for race model)
  - quali_position (for qualifying model)
"""

import pandas as pd
import numpy as np
import os

DATA_DIR = os.path.join(os.path.dirname(__file__), "data")


def load_raw_data():
    results   = pd.read_csv(f"{DATA_DIR}/raw_results.csv")
    quali     = pd.read_csv(f"{DATA_DIR}/raw_qualifying.csv")
    drv_stand = pd.read_csv(f"{DATA_DIR}/raw_driver_standings.csv")
    con_stand = pd.read_csv(f"{DATA_DIR}/raw_constructor_standings.csv")
    return results, quali, drv_stand, con_stand


def build_rolling_driver_form(results: pd.DataFrame) -> pd.DataFrame:
    """
    Rolling statistics per driver, computed using ONLY prior races.
    Sorted chronologically; for each row, only rows before it are used.
    """
    df = results.sort_values(["season", "round"]).copy()

    def is_dnf(status):
        if pd.isna(status):
            return 0
        s = str(status).strip()
        if s == "Finished" or (s.startswith("+") and "Lap" in s):
            return 0
        return 1

    df["dnf_flag"] = df["status"].apply(is_dnf)

    records = []
    for driver_id, grp in df.groupby("driver_id"):
        grp = grp.sort_values(["season", "round"]).reset_index(drop=True)
        for i, row in grp.iterrows():
            past   = grp.iloc[:i]
            last5  = past.tail(5)
            last10 = past.tail(10)
            records.append({
                "season":                int(row["season"]),
                "round":                 int(row["round"]),
                "driver_id":             driver_id,
                "driver_avg_finish_l5":  float(last5["finish_position"].mean())  if len(last5)  > 0 else np.nan,
                "driver_avg_finish_l10": float(last10["finish_position"].mean()) if len(last10) > 0 else np.nan,
                "driver_dnf_rate_l10":   float(last10["dnf_flag"].mean())        if len(last10) > 0 else np.nan,
            })

    return pd.DataFrame(records)


def build_rolling_constructor_form(results: pd.DataFrame) -> pd.DataFrame:
    """
    Average best-finish per constructor, last 5 races (prior races only).
    """
    df = results.sort_values(["season", "round"]).copy()

    best_per_race = (
        df.groupby(["season", "round", "constructor_id"])["finish_position"]
          .min().reset_index()
          .rename(columns={"finish_position": "best_finish"})
    )

    records = []
    for cid, grp in best_per_race.groupby("constructor_id"):
        grp = grp.sort_values(["season", "round"]).reset_index(drop=True)
        for i, row in grp.iterrows():
            past   = grp.iloc[:i]
            last5  = past.tail(5)
            avg_l5 = float(last5["best_finish"].mean()) if len(last5) > 0 else np.nan
            records.append({
                "season":               int(row["season"]),
                "round":                int(row["round"]),
                "constructor_id":       cid,
                "constr_avg_finish_l5": avg_l5,
            })

    return pd.DataFrame(records)


def build_circuit_history(results: pd.DataFrame) -> pd.DataFrame:
    """
    Per driver-circuit, historical stats using ONLY prior seasons.
    (Avoids same-year leakage for early rounds.)
    """
    df = results.sort_values(["season", "round"]).copy()
    df["podium"] = (df["finish_position"] <= 3).astype(int)

    records = []
    for (driver_id, circuit_id), grp in df.groupby(["driver_id", "circuit_id"]):
        grp = grp.sort_values("season").reset_index(drop=True)
        for i, row in grp.iterrows():
            past = grp[grp["season"] < row["season"]]
            if len(past) == 0:
                records.append({
                    "season":              int(row["season"]),
                    "round":               int(row["round"]),
                    "driver_id":           driver_id,
                    "circuit_id":          circuit_id,
                    "circuit_avg_finish":  np.nan,
                    "circuit_appearances": 0,
                    "circuit_podium_rate": np.nan,
                })
            else:
                records.append({
                    "season":              int(row["season"]),
                    "round":               int(row["round"]),
                    "driver_id":           driver_id,
                    "circuit_id":          circuit_id,
                    "circuit_avg_finish":  float(past["finish_position"].mean()),
                    "circuit_appearances": len(past),
                    "circuit_podium_rate": float(past["podium"].mean()),
                })

    return pd.DataFrame(records)


def build_feature_matrix() -> pd.DataFrame:
    """
    Assembles all features into the final ML-ready dataset.
    """
    print("Loading raw data…")
    results, quali, drv_stand, con_stand = load_raw_data()
    print(f"  Results:    {len(results)} rows")
    print(f"  Qualifying: {len(quali)} rows")
    print(f"  Drv stand:  {len(drv_stand)} rows")
    print(f"  Con stand:  {len(con_stand)} rows")

    print("Computing rolling driver form…")
    driver_form = build_rolling_driver_form(results)

    print("Computing rolling constructor form…")
    constr_form = build_rolling_constructor_form(results)

    print("Computing circuit-specific history…")
    circuit_hist = build_circuit_history(results)

    # ── Base ──────────────────────────────────────────────────────────────────
    df = results[[
        "season", "round", "race_name", "circuit_id", "race_date",
        "driver_id", "driver_code", "constructor_id",
        "finish_position", "grid_position", "status"
    ]].copy()

    # ── Qualifying position ───────────────────────────────────────────────────
    q = quali[["season", "round", "driver_id", "quali_position"]].copy()
    df = df.merge(q, on=["season", "round", "driver_id"], how="left")
    df["quali_position"] = df["quali_position"].fillna(df["grid_position"])

    # ── Previous season driver standings ─────────────────────────────────────
    drv_prev = drv_stand.copy()
    drv_prev["season"] = drv_prev["season"] + 1   # next season sees this
    drv_prev = drv_prev.rename(columns={
        "driver_final_pts":   "driver_prev_season_pts",
        "driver_final_pos":   "driver_prev_season_pos",
        "driver_season_wins": "driver_prev_season_wins",
    })
    df = df.merge(
        drv_prev[["season", "driver_id",
                  "driver_prev_season_pts", "driver_prev_season_pos",
                  "driver_prev_season_wins"]],
        on=["season", "driver_id"], how="left"
    )
    df["driver_prev_season_pts"]  = df["driver_prev_season_pts"].fillna(0.0)
    df["driver_prev_season_pos"]  = df["driver_prev_season_pos"].fillna(20)
    df["driver_prev_season_wins"] = df["driver_prev_season_wins"].fillna(0)

    # ── Previous season constructor standings ─────────────────────────────────
    con_prev = con_stand.copy()
    con_prev["season"] = con_prev["season"] + 1
    con_prev = con_prev.rename(columns={
        "constr_final_pts":    "constr_prev_season_pts",
        "constr_final_pos":    "constr_prev_season_pos",
        "constr_season_wins":  "constr_prev_season_wins",
    })
    df = df.merge(
        con_prev[["season", "constructor_id",
                  "constr_prev_season_pts", "constr_prev_season_pos",
                  "constr_prev_season_wins"]],
        on=["season", "constructor_id"], how="left"
    )
    df["constr_prev_season_pts"]  = df["constr_prev_season_pts"].fillna(0.0)
    df["constr_prev_season_pos"]  = df["constr_prev_season_pos"].fillna(10)
    df["constr_prev_season_wins"] = df["constr_prev_season_wins"].fillna(0)

    # ── Driver rolling form ───────────────────────────────────────────────────
    df = df.merge(
        driver_form[["season", "round", "driver_id",
                     "driver_avg_finish_l5", "driver_avg_finish_l10",
                     "driver_dnf_rate_l10"]],
        on=["season", "round", "driver_id"], how="left"
    )
    df["driver_avg_finish_l5"]  = df["driver_avg_finish_l5"].fillna(11.0)
    df["driver_avg_finish_l10"] = df["driver_avg_finish_l10"].fillna(11.0)
    df["driver_dnf_rate_l10"]   = df["driver_dnf_rate_l10"].fillna(0.1)

    # ── Constructor rolling form ──────────────────────────────────────────────
    df = df.merge(
        constr_form[["season", "round", "constructor_id", "constr_avg_finish_l5"]],
        on=["season", "round", "constructor_id"], how="left"
    )
    df["constr_avg_finish_l5"] = df["constr_avg_finish_l5"].fillna(6.0)

    # ── Circuit history ───────────────────────────────────────────────────────
    df = df.merge(
        circuit_hist[["season", "round", "driver_id", "circuit_id",
                      "circuit_avg_finish", "circuit_appearances",
                      "circuit_podium_rate"]],
        on=["season", "round", "driver_id", "circuit_id"], how="left"
    )
    df["circuit_avg_finish"]  = df["circuit_avg_finish"].fillna(11.0)
    df["circuit_appearances"] = df["circuit_appearances"].fillna(0)
    df["circuit_podium_rate"] = df["circuit_podium_rate"].fillna(0.0)

    # ── Season-level ──────────────────────────────────────────────────────────
    df["season_round"] = df["round"]
    df["season_year"]  = df["season"]

    # ── Enhanced Features (Qualifying Anchoring + Regulation & Upgrade Robustness) ──
    # 1. Teammate & Car Pace Benchmark (team_best_grid & delta)
    team_best = (
        df.groupby(["season", "round", "constructor_id"])["grid_position"]
          .min().reset_index()
          .rename(columns={"grid_position": "team_best_grid"})
    )
    df = df.merge(team_best, on=["season", "round", "constructor_id"], how="left")
    df["grid_vs_team_best"] = df["grid_position"] - df["team_best_grid"]

    # 2. Key Grid Advantage Indicators
    df["is_pole"]       = (df["grid_position"] == 1).astype(int)
    df["is_front_row"]  = (df["grid_position"] <= 2).astype(int)
    df["is_top3_grid"]  = (df["grid_position"] <= 3).astype(int)
    df["is_top6_grid"]  = (df["grid_position"] <= 6).astype(int)
    df["grid_inv"]      = 1.0 / np.maximum(df["grid_position"], 1)

    # 3. Form Trend (momentum)
    df["form_trend"]    = df["driver_avg_finish_l5"] - df["driver_avg_finish_l10"]

    # 4. In-season upgrade decay & Regulation overhaul discount
    # As rounds advance, current season upgrades make prior year standings obsolete
    NEW_REG_YEARS = {2014, 2022, 2026}
    df["is_new_reg_era"] = df["season"].isin(NEW_REG_YEARS).astype(int)
    
    round_weight = np.exp(-df["round"] / 10.0)
    reg_factor = np.where(df["is_new_reg_era"] == 1, 0.5, 1.0)
    df["constr_prev_pts_decayed"] = df["constr_prev_season_pts"] * round_weight * reg_factor
    df["driver_prev_pts_decayed"] = df["driver_prev_season_pts"] * round_weight * reg_factor

    print(f"\nFeature matrix: {len(df)} rows × {len(df.columns)} columns")
    print(f"Seasons:        {df['season'].min()} – {df['season'].max()}")

    return df


RACE_FEATURE_COLS = [
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

QUALI_FEATURE_COLS = [
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


if __name__ == "__main__":
    df = build_feature_matrix()
    out = f"{DATA_DIR}/features.csv"
    df.to_csv(out, index=False)
    print(f"\n[OK] Saved -> {out}")
