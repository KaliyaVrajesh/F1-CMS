"""
predict.py
──────────
Generates race and qualifying predictions using the trained ML model bundle.

Usage (standalone):
    python predict.py --circuit baku --year 2026 --type race
    python predict.py --circuit baku --year 2026 --type qualifying
"""

import os
import sys
import json
import time
import argparse
import numpy as np
import pandas as pd
import joblib
import requests

# Ensure local ml directory is in sys.path for unpickling custom ensemble classes
_DIR = os.path.dirname(os.path.abspath(__file__))
if _DIR not in sys.path:
    sys.path.insert(0, _DIR)

try:
    from ensemble import BlendedRegressor
except ImportError:
    pass


MODEL_DIR  = os.path.join(os.path.dirname(__file__), "model")
DATA_DIR   = os.path.join(os.path.dirname(__file__), "data")
MODEL_PATH = os.path.join(MODEL_DIR, "f1_prediction_model.pkl")

BASE_URL = "https://api.jolpi.ca/ergast/f1"

_MODEL_BUNDLE = None
_CACHE = {}  # in-memory cache to prevent repeated API calls


def load_model() -> dict:
    """Load the model bundle, caching after first load."""
    global _MODEL_BUNDLE
    if _MODEL_BUNDLE is None:
        if not os.path.exists(MODEL_PATH):
            raise FileNotFoundError(
                f"Trained model not found at {MODEL_PATH}. "
                "Run train_model.py first."
            )
        _MODEL_BUNDLE = joblib.load(MODEL_PATH)
    return _MODEL_BUNDLE


def safe_get(url: str, retries: int = 3, timeout: int = 12) -> dict:
    if url in _CACHE:
        return _CACHE[url]
    for attempt in range(retries):
        try:
            r = requests.get(url, timeout=timeout)
            if r.status_code == 200:
                data = r.json()
                _CACHE[url] = data
                return data
            if r.status_code == 404:
                return {}
        except Exception:
            if attempt < retries - 1:
                time.sleep(0.5)
    return {}


# ── Live data fetchers ────────────────────────────────────────────────────────

def get_driver_standings(year: int) -> list[dict]:
    """
    Fetch driver standings.
    Prefers current season if data exists (>0 races); falls back to previous season.
    This ensures regulation changes, team moves, and current upgrades are respected.
    """
    curr_data = safe_get(f"{BASE_URL}/{year}/driverStandings.json")
    curr_lst  = (curr_data.get("MRData", {})
                          .get("StandingsTable", {})
                          .get("StandingsLists", [{}])[0]
                          .get("DriverStandings", []))

    prev_data = safe_get(f"{BASE_URL}/{year - 1}/driverStandings.json")
    prev_lst  = (prev_data.get("MRData", {})
                          .get("StandingsTable", {})
                          .get("StandingsLists", [{}])[0]
                          .get("DriverStandings", []))

    prev_map = {}
    for s in prev_lst:
        if s.get("Driver"):
            did = s["Driver"]["driverId"]
            prev_map[did] = {
                "pts":  float(s.get("points", 0)),
                "pos":  int(s.get("position", 20)),
                "wins": int(s.get("wins", 0)),
            }

    roster_list = curr_lst if curr_lst else prev_lst
    if not roster_list:
        raise ValueError(f"No driver standings available for {year}.")

    result = []
    has_current_pts = any(float(s.get("points", 0)) > 0 for s in curr_lst)

    for s in roster_list:
        if not (s.get("Driver") and s.get("Constructors")):
            continue
        did = s["Driver"]["driverId"]
        prev = prev_map.get(did, {"pts": 0.0, "pos": 20, "wins": 0})
        
        curr_pts = float(s.get("points", 0))
        curr_pos = int(s.get("position", 20))
        curr_wins = int(s.get("wins", 0))

        # If current season has active points, blend current standing with prev season
        if has_current_pts:
            pts_val = curr_pts
            pos_val = curr_pos
            wins_val = curr_wins
        else:
            pts_val = prev["pts"]
            pos_val = prev["pos"]
            wins_val = prev["wins"]

        result.append({
            "driver_id":              did,
            "driver_code":            s["Driver"].get("code", s["Driver"]["familyName"][:3].upper()),
            "first_name":             s["Driver"]["givenName"],
            "last_name":              s["Driver"]["familyName"],
            "nationality":            s["Driver"]["nationality"],
            "constructor_id":         s["Constructors"][0]["constructorId"],
            "constructor":            s["Constructors"][0]["name"],
            "driver_prev_season_pts":  pts_val,
            "driver_prev_season_pos":  pos_val,
            "driver_prev_season_wins": wins_val,
        })
    return result


def get_constructor_standings(year: int) -> list[dict]:
    """Fetch constructor standings, preferring current season if active."""
    curr_data = safe_get(f"{BASE_URL}/{year}/constructorStandings.json")
    curr_lst  = (curr_data.get("MRData", {})
                          .get("StandingsTable", {})
                          .get("StandingsLists", [{}])[0]
                          .get("ConstructorStandings", []))

    prev_data = safe_get(f"{BASE_URL}/{year - 1}/constructorStandings.json")
    prev_lst  = (prev_data.get("MRData", {})
                          .get("StandingsTable", {})
                          .get("StandingsLists", [{}])[0]
                          .get("ConstructorStandings", []))

    has_current_pts = any(float(s.get("points", 0)) > 0 for s in curr_lst)
    c_list = curr_lst if has_current_pts and curr_lst else (prev_lst if prev_lst else curr_lst)

    result = []
    for s in c_list:
        if not s.get("Constructor"):
            continue
        cid = s["Constructor"]["constructorId"]
        result.append({
            "constructor_id":         cid,
            "constr_prev_season_pts":  float(s.get("points", 0)),
            "constr_prev_season_pos":  int(s.get("position", 10)),
            "constr_prev_season_wins": int(s.get("wins", 0)),
        })
    return result


def get_season_results_summary(year: int) -> tuple[dict, dict, dict]:
    """
    Fetch all completed races for the season in ONE call and compute rolling form.
    Returns: (driver_l5_map, driver_l10_map, constr_l5_map).
    """
    data = safe_get(f"{BASE_URL}/{year}/results.json?limit=500")
    races = data.get("MRData", {}).get("RaceTable", {}).get("Races", [])

    # If few or no races in current year, supplement with previous year
    if len(races) < 5:
        prev_data = safe_get(f"{BASE_URL}/{year - 1}/results.json?limit=500")
        prev_races = prev_data.get("MRData", {}).get("RaceTable", {}).get("Races", [])
        races = prev_races + races

    driver_history = {}
    constr_history = {}

    for race in races:
        for r in race.get("Results", []):
            did = r["Driver"]["driverId"]
            cid = r["Constructor"]["constructorId"]
            try:
                pos = int(r["position"])
            except (ValueError, KeyError):
                pos = 20
            status = r.get("status", "Finished")
            is_dnf = not (status == "Finished" or ("+" in status and "Lap" in status))

            if did not in driver_history:
                driver_history[did] = []
            driver_history[did].append((pos, is_dnf))

            if cid not in constr_history:
                constr_history[cid] = []
            constr_history[cid].append(pos)

    driver_l5 = {}
    driver_l10 = {}
    driver_dnf = {}
    for did, hist in driver_history.items():
        positions = [p for p, _ in hist]
        dnfs = [d for _, d in hist]
        l5 = positions[-5:]
        l10 = positions[-10:]
        driver_l5[did] = float(np.mean(l5)) if l5 else 10.0
        driver_l10[did] = float(np.mean(l10)) if l10 else 10.0
        driver_dnf[did] = float(sum(dnfs[-10:]) / max(len(dnfs[-10:]), 1))

    constr_l5 = {}
    for cid, hist in constr_history.items():
        l5 = hist[-10:]  # 2 cars per race -> 10 results = 5 races
        constr_l5[cid] = float(np.mean(l5)) if l5 else 8.0

    return driver_l5, driver_l10, driver_dnf, constr_l5


def get_circuit_history(circuit_id: str) -> dict:
    """Read circuit history from local database (0 ms)."""
    raw_path = os.path.join(DATA_DIR, "raw_results.csv")
    if not os.path.exists(raw_path):
        return {}
    try:
        df = pd.read_csv(raw_path)
        sub = df[df["circuit_id"] == circuit_id]
        if sub.empty:
            return {}
        res = {}
        for did, grp in sub.groupby("driver_id"):
            res[did] = {
                "avg_finish": float(grp["finish_position"].mean()),
                "appearances": len(grp),
                "podium_rate": float((grp["finish_position"] <= 3).mean()),
            }
        return res
    except Exception:
        return {}


def get_qualifying_order(circuit_id: str, year: int, round_num: int | None = None) -> dict[str, int]:
    """
    Get official qualifying results for a round from Jolpica.
    Returns {driver_id: qualifying_position}.
    """
    if round_num is None:
        return {}
    data = safe_get(f"{BASE_URL}/{year}/{round_num}/qualifying.json")
    races = data.get("MRData", {}).get("RaceTable", {}).get("Races", [])
    if not races:
        return {}
    result = {}
    for r in races[0].get("QualifyingResults", []):
        result[r["Driver"]["driverId"]] = int(r["position"])
    return result


def get_round_for_circuit(circuit_id: str, year: int) -> int | None:
    """Look up round number for a circuit from the season race calendar."""
    data = safe_get(f"{BASE_URL}/{year}.json")
    races = data.get("MRData", {}).get("RaceTable", {}).get("Races", [])
    for r in races:
        if r.get("Circuit", {}).get("circuitId") == circuit_id:
            try:
                return int(r["round"])
            except (ValueError, KeyError):
                pass
    return None


def filter_active_drivers_per_team(drivers: list[dict]) -> list[dict]:
    """
    Enforce official F1 regulation that each constructor enters at most 2 cars per race.
    If a constructor has >2 drivers in season standings (e.g. driver swaps or reserve subs),
    we keep the top 2 active drivers with the highest points / recent championship position.
    """
    by_team = {}
    for d in drivers:
        cid = d["constructor_id"]
        by_team.setdefault(cid, []).append(d)

    active = []
    for cid, team_drivers in by_team.items():
        if len(team_drivers) > 2:
            team_drivers.sort(
                key=lambda x: (x.get("driver_prev_season_pts", 0), -x.get("driver_prev_season_pos", 20)),
                reverse=True,
            )
            active.extend(team_drivers[:2])
        else:
            active.extend(team_drivers)
    return active


# ── Feature assembly ──────────────────────────────────────────────────────────

def assemble_base_features(circuit_id: str, year: int, round_num: int | None = None) -> pd.DataFrame:
    """Build pre-race base feature dataframe for all active drivers."""
    if round_num is None:
        round_num = get_round_for_circuit(circuit_id, year)

    drivers = get_driver_standings(year)

    # If official qualifying exists for this round, strictly restrict to those entered drivers
    official_q = get_qualifying_order(circuit_id, year, round_num) if round_num else {}
    if official_q:
        drivers = [d for d in drivers if d["driver_id"] in official_q]
    else:
        # Enforce maximum 2 drivers per team (excludes dropped/reserve drivers like Tsunoda)
        drivers = filter_active_drivers_per_team(drivers)

    constructors = get_constructor_standings(year)
    constr_map = {c["constructor_id"]: c for c in constructors}

    driver_l5, driver_l10, driver_dnf, constr_l5 = get_season_results_summary(year)
    circuit_hist_map = get_circuit_history(circuit_id)

    NEW_REG_YEARS = {2014, 2022, 2026}
    is_new_reg = 1 if year in NEW_REG_YEARS else 0
    rnd = round_num or 1
    round_weight = np.exp(-rnd / 10.0)

    reg_factor = 0.5 if is_new_reg else 1.0

    rows = []
    for drv in drivers:
        did = drv["driver_id"]
        cid = drv["constructor_id"]
        c = constr_map.get(cid, {})

        c_prev_pts = c.get("constr_prev_season_pts", 0.0)
        c_prev_pos = c.get("constr_prev_season_pos", 10)
        c_avg_l5   = constr_l5.get(cid, max(c_prev_pos * 1.5, 3.0))

        # Driver rolling form — for rookies, baseline by their constructor's pace
        if did in driver_l5:
            d_avg_l5  = driver_l5[did]
            d_avg_l10 = driver_l10[did]
            d_dnf     = driver_dnf.get(did, 0.1)
        else:
            # Rookie in a top car (e.g. Antonelli in Mercedes) inherits car capability
            d_avg_l5  = c_avg_l5 + 1.0
            d_avg_l10 = c_avg_l5 + 1.5
            d_dnf     = 0.1

        chist = circuit_hist_map.get(did, {"avg_finish": 11.0, "appearances": 0, "podium_rate": 0.0})

        c_decayed = c_prev_pts * round_weight * reg_factor
        d_decayed = drv["driver_prev_season_pts"] * round_weight * reg_factor

        rows.append({
            "driver_id":                did,
            "driver_code":              drv["driver_code"],
            "first_name":               drv["first_name"],
            "last_name":                drv["last_name"],
            "nationality":              drv["nationality"],
            "constructor_id":           cid,
            "constructor":              drv["constructor"],
            "driver_prev_season_pts":   drv["driver_prev_season_pts"],
            "driver_prev_season_pos":   drv["driver_prev_season_pos"],
            "driver_prev_season_wins":  drv["driver_prev_season_wins"],
            "constr_prev_season_pts":   c_prev_pts,
            "constr_prev_season_pos":   c_prev_pos,
            "constr_prev_season_wins":  c.get("constr_prev_season_wins", 0),
            "driver_avg_finish_l5":     d_avg_l5,
            "driver_avg_finish_l10":    d_avg_l10,
            "form_trend":               d_avg_l5 - d_avg_l10,
            "driver_dnf_rate_l10":      d_dnf,
            "constr_avg_finish_l5":     c_avg_l5,
            "circuit_avg_finish":       chist["avg_finish"],
            "circuit_appearances":      chist["appearances"],
            "circuit_podium_rate":      chist["podium_rate"],
            "constr_prev_pts_decayed":  c_decayed,
            "driver_prev_pts_decayed":  d_decayed,
            "season_round":             rnd,
            "is_new_reg_era":           is_new_reg,
        })

    return pd.DataFrame(rows)


# ── Public API ────────────────────────────────────────────────────────────────

def predict_race(
    circuit_id: str,
    year: int,
    round_num: int | None = None,
    qualifying_grid: dict[str, int] | None = None,
    prediction_type: str = "race",
    verbose: bool = False,
) -> dict:
    """
    Main prediction endpoint for both Race and Qualifying.
    
    If prediction_type == 'qualifying':
      Uses pre-qualifying car pace & driver form to predict the qualifying classification
      and pole position probabilities.
      
    If prediction_type == 'race':
      Uses starting grid / qualifying as the HEAVIEST predictor.
      Automatically retrieves real qualifying if available on Jolpica.
      If not yet available, runs the qualifying model to generate the expected grid.
    """
    bundle = load_model()
    df = assemble_base_features(circuit_id=circuit_id, year=year, round_num=round_num)
    if df.empty:
        raise ValueError("Could not assemble features — no driver data available.")

    # =========================================================================
    # QUALIFYING PREDICTION MODE
    # =========================================================================
    if prediction_type == "qualifying":
        q_features = bundle.get("quali_features", [
            "constr_avg_finish_l5", "driver_avg_finish_l5", "driver_avg_finish_l10",
            "form_trend", "circuit_avg_finish", "circuit_appearances", "circuit_podium_rate",
            "constr_prev_pts_decayed", "driver_prev_pts_decayed", "is_new_reg_era", "season_round",
        ])
        X_q = df[q_features].fillna(10)

        q_reg = bundle["quali_regressor"]
        q_pole_clf = bundle["quali_pole_clf"]
        q_top3_clf = bundle["quali_top3_clf"]

        pred_quali = q_reg.predict(X_q)
        pred_quali = np.clip(pred_quali, 1.0, 20.0)

        raw_pole = q_pole_clf.predict_proba(X_q)[:, 1]
        raw_top3 = q_top3_clf.predict_proba(X_q)[:, 1]

        pole_sum = raw_pole.sum()
        pole_probs = (raw_pole / pole_sum * 100) if pole_sum > 0 else raw_pole * 100
        pole_probs = np.round(np.clip(pole_probs, 0.1, 60.0), 1)
        pole_probs = np.round((pole_probs / pole_probs.sum()) * 100, 1)

        top3_probs = np.round(np.clip(raw_top3 * 100, 0.5, 95.0), 1)

        order = np.argsort(pred_quali)
        df_sorted = df.iloc[order].reset_index(drop=True)

        predictions = []
        for rank, idx in enumerate(order, start=1):
            row = df.iloc[idx]
            predictions.append({
                "rank":                rank,
                "driver_id":           row["driver_id"],
                "driver_code":         row["driver_code"],
                "name":                f"{row['first_name']} {row['last_name']}",
                "constructor":         row["constructor"],
                "constructor_id":      row["constructor_id"],
                "nationality":         row["nationality"],
                "predicted_position":  round(float(pred_quali[idx]), 2),
                "win_probability":     float(pole_probs[idx]),
                "podium_probability":  float(top3_probs[idx]),
                "grid_position":       rank,
                "championship_pos":    int(row["driver_prev_season_pos"]),
                "championship_pts":    float(row["driver_prev_season_pts"]),
                "season_wins":         int(row["driver_prev_season_wins"]),
                "circuit_appearances": int(row["circuit_appearances"]),
                "circuit_avg_finish":  round(float(row["circuit_avg_finish"]), 2),
                "circuit_podium_rate": round(float(row["circuit_podium_rate"]) * 100, 1),
                "recent_avg_l5":       round(float(row["driver_avg_finish_l5"]), 2),
                "dnf_rate":            round(float(row["driver_dnf_rate_l10"]) * 100, 1),
                "constr_champ_pos":    int(row["constr_prev_season_pos"]),
                "constr_champ_pts":    float(row["constr_prev_season_pts"]),
            })

        return {
            "circuit_id":   circuit_id,
            "year":         year,
            "round":        round_num,
            "type":         "qualifying",
            "model":        bundle.get("quali_model_name", "CatBoost Blend Regressor + Calibrated Pole Classifier"),
            "generated_at": pd.Timestamp.utcnow().isoformat() + "Z",
            "predictions":  predictions,
        }

    # =========================================================================
    # RACE PREDICTION MODE (QUALIFYING AS HEAVIEST ANCHOR)
    # =========================================================================
    # 1. Determine Starting Grid:
    # Priority A: explicitly supplied grid
    # Priority B: official qualifying from Jolpica
    # Priority C: run the Qualifying Model to predict starting positions
    if round_num is None:
        round_num = get_round_for_circuit(circuit_id, year)

    grid_source = "provided"
    final_grid = {}
    if qualifying_grid:
        final_grid = qualifying_grid
    elif round_num:
        official_q = get_qualifying_order(circuit_id, year, round_num)
        if official_q:
            final_grid = official_q
            grid_source = "official_qualifying"

    # Strictly restrict to drivers who actually entered / qualified for this race
    if final_grid and grid_source in ("official_qualifying", "provided"):
        df = df[df["driver_id"].isin(final_grid.keys())].copy()

    if not final_grid:
        # Run pre-qualifying model to get estimated starting positions
        grid_source = "predicted_qualifying"
        q_features = bundle.get("quali_features")
        X_q = df[q_features].fillna(10)
        pred_q_positions = bundle["quali_regressor"].predict(X_q)
        q_order = np.argsort(pred_q_positions)
        for g_rank, idx in enumerate(q_order, start=1):
            final_grid[df.iloc[idx]["driver_id"]] = g_rank

    # Assign grid positions to dataframe
    grid_positions = []
    for _, row in df.iterrows():
        did = row["driver_id"]
        grid_positions.append(final_grid.get(did, 20))
    df["grid_position"] = grid_positions

    # 2. Compute Car & Teammate Benchmarks
    team_best = (
        df.groupby("constructor_id")["grid_position"]
          .min().to_dict()
    )
    df["team_best_grid"] = df["constructor_id"].map(team_best)
    df["grid_vs_team_best"] = df["grid_position"] - df["team_best_grid"]

    # 3. Grid Advantage Indicators
    df["is_pole"]      = (df["grid_position"] == 1).astype(int)
    df["is_front_row"] = (df["grid_position"] <= 2).astype(int)
    df["is_top3_grid"] = (df["grid_position"] <= 3).astype(int)
    df["is_top6_grid"] = (df["grid_position"] <= 6).astype(int)
    df["grid_inv"]     = 1.0 / np.maximum(df["grid_position"], 1)

    race_features = bundle.get("race_features", bundle.get("features"))
    X_r = df[race_features].fillna(10)

    # 4. Predict finishing positions
    regressor = bundle["regressor"]
    pred_positions = regressor.predict(X_r)
    pred_positions = np.clip(pred_positions, 1.0, 20.0)

    # 5. Predict Win and Podium probabilities
    win_clf    = bundle["win_clf"]
    podium_clf = bundle["podium_clf"]

    raw_win = win_clf.predict_proba(X_r)[:, 1]
    raw_pod = podium_clf.predict_proba(X_r)[:, 1]

    # Normalize win probabilities: sum to 100%
    win_sum = raw_win.sum()
    win_probs = (raw_win / win_sum * 100) if win_sum > 0 else raw_win * 100
    win_probs = np.clip(win_probs, 0.1, 65.0)
    win_probs = np.round((win_probs / win_probs.sum()) * 100, 1)

    pod_probs = np.round(np.clip(raw_pod * 100, 0.5, 95.0), 1)

    # Sort drivers by predicted finish position
    order = np.argsort(pred_positions)
    predictions = []
    for rank, idx in enumerate(order, start=1):
        row = df.iloc[idx]
        predictions.append({
            "rank":                rank,
            "driver_id":           row["driver_id"],
            "driver_code":         row["driver_code"],
            "name":                f"{row['first_name']} {row['last_name']}",
            "constructor":         row["constructor"],
            "constructor_id":      row["constructor_id"],
            "nationality":         row["nationality"],
            "predicted_position":  round(float(pred_positions[idx]), 2),
            "win_probability":     float(win_probs[idx]),
            "podium_probability":  float(pod_probs[idx]),
            "grid_position":       int(row["grid_position"]),
            "grid_source":         grid_source,
            "championship_pos":    int(row["driver_prev_season_pos"]),
            "championship_pts":    float(row["driver_prev_season_pts"]),
            "season_wins":         int(row["driver_prev_season_wins"]),
            "circuit_appearances": int(row["circuit_appearances"]),
            "circuit_avg_finish":  round(float(row["circuit_avg_finish"]), 2),
            "circuit_podium_rate": round(float(row["circuit_podium_rate"]) * 100, 1),
            "recent_avg_l5":       round(float(row["driver_avg_finish_l5"]), 2),
            "dnf_rate":            round(float(row["driver_dnf_rate_l10"]) * 100, 1),
            "constr_champ_pos":    int(row["constr_prev_season_pos"]),
            "constr_champ_pts":    float(row["constr_prev_season_pts"]),
        })

    return {
        "circuit_id":   circuit_id,
        "year":         year,
        "round":        round_num,
        "type":         "race",
        "grid_source":  grid_source,
        "model":        bundle.get("model_name", "Hybrid CatBoost-LightGBM Ensemble"),
        "generated_at": pd.Timestamp.utcnow().isoformat() + "Z",
        "predictions":  predictions,
    }


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="F1 ML Prediction")
    parser.add_argument("--circuit", required=True, help="Circuit ID (e.g. baku)")
    parser.add_argument("--year",    type=int, default=2026, help="Season year")
    parser.add_argument("--round",   type=int, default=None, help="Round number")
    parser.add_argument("--type",    type=str, default="race", choices=["race", "qualifying"])
    parser.add_argument("--verbose", action="store_true")
    args = parser.parse_args()

    result = predict_race(
        circuit_id=args.circuit,
        year=args.year,
        round_num=args.round,
        prediction_type=args.type,
        verbose=args.verbose,
    )

    print(f"\n{args.type.upper()} PREDICTIONS for {args.circuit.upper()} {args.year} (Round {args.round}):")
    print(f"{'Rank':4s} {'Driver':6s} {'Team':12s} {'Grid':6s} {'PredPos':8s} {'Win/Pole%':10s} {'Podium/Top3%':12s}")
    print("-" * 65)
    for p in result["predictions"][:10]:
        print(
            f"P{p['rank']:2d}  {p['driver_code']:6s} {p['constructor']:<12s} "
            f"P{p['grid_position']:<5d} P{p['predicted_position']:<6.1f} "
            f"{p['win_probability']:6.1f}%     {p['podium_probability']:6.1f}%"
        )
