"""
feature_engineering.py
───────────────────────
Builds the ML-ready feature matrix from raw collected data.

Features (all strictly pre-race — no data leakage):

  1.  grid_position           — Starting grid (from qualifying)
  2.  quali_position          — Qualifying classification position
  3.  driver_prev_season_pts  — Driver's total points in PREVIOUS season
  4.  driver_prev_season_pos  — Driver's final championship pos in PREVIOUS season
  5.  driver_prev_season_wins — Driver's wins in PREVIOUS season
  6.  constr_prev_season_pts  — Constructor's total points in PREVIOUS season
  7.  constr_prev_season_pos  — Constructor's final championship pos in PREVIOUS season
  8.  constr_prev_season_wins — Constructor's wins in PREVIOUS season
  9.  driver_avg_finish_l5    — Driver's average finishing position (last 5 races THIS season, before this race)
  10. driver_avg_finish_l10   — Driver's average finishing position (last 10 races)
  11. driver_dnf_rate_l10     — Driver's DNF rate in last 10 races
  12. constr_avg_finish_l5    — Constructor's average finishing position (last 5 races this season)
  13. circuit_avg_finish      — Driver's historical average finish at this circuit (prior seasons only)
  14. circuit_appearances     — How many times driver has raced at this circuit (prior seasons)
  15. circuit_podium_rate     — Driver's podium rate at this circuit (prior seasons)
  16. season_round            — Race round number in the season
  17. season_year             — Year (overall era/competitiveness context)

Target: finish_position (regression, 1–20+)

Note on standings features:
  We use PREVIOUS season's final standings rather than pre-round snapshots.
  This avoids making 20 API calls per season (which causes 429 rate-limiting)
  while still providing a valid, leakage-free proxy for driver/constructor quality.
  For the first race of a season, the previous season's final standings are
  genuinely the best available pre-race information.
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
                "season":              int(row["season"]),
                "round":               int(row["round"]),
                "driver_id":           driver_id,
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
    print(f"  Results:   {len(results)} rows")
    print(f"  Qualifying:{len(quali)} rows")
    print(f"  Drv stand: {len(drv_stand)} rows")
    print(f"  Con stand: {len(con_stand)} rows")

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
    # Shift season + 1 so that season N's final standings become
    # available as a feature for season N+1 races.
    drv_prev = drv_stand.copy()
    drv_prev["season"] = drv_prev["season"] + 1   # next season will see this
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
    # For first season in dataset (2010) or rookies: fill conservatively
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

    print(f"\nFeature matrix: {len(df)} rows × {len(df.columns)} columns")
    print(f"Seasons:        {df['season'].min()} – {df['season'].max()}")
    print(f"Missing values:\n{df[FEATURE_COLS].isnull().sum()[df[FEATURE_COLS].isnull().sum() > 0]}")

    return df


FEATURE_COLS = [
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


if __name__ == "__main__":
    df = build_feature_matrix()
    out = f"{DATA_DIR}/features.csv"
    df.to_csv(out, index=False)
    print(f"\n✅ Saved → {out}")
    print(df[FEATURE_COLS + ["finish_position"]].describe().round(2))
