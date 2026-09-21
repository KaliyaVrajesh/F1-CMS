"""
predict.py
──────────
Generates predictions for an upcoming race using the trained ML model.

Usage (standalone):
    python predict.py --circuit monza --year 2026

The prediction pipeline:
  1. Fetch current driver/constructor standings from Jolpica API
  2. Fetch circuit history for each driver
  3. Compute driver rolling form from historical race results
  4. Assemble feature vectors (one per driver)
  5. Load trained model bundle
  6. Predict finish_position for each driver
  7. Compute win/podium probabilities from calibrated classifiers
  8. Return ranked predictions with explanations
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

MODEL_DIR = os.path.join(os.path.dirname(__file__), "model")
DATA_DIR  = os.path.join(os.path.dirname(__file__), "data")
MODEL_PATH = f"{MODEL_DIR}/f1_prediction_model.pkl"

BASE_URL = "https://api.jolpi.ca/ergast/f1"

_MODEL_BUNDLE = None  # module-level cache


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


def safe_get(url: str, retries: int = 3) -> dict:
    for attempt in range(retries):
        try:
            r = requests.get(url, timeout=15)
            r.raise_for_status()
            return r.json()
        except Exception:
            if attempt < retries - 1:
                time.sleep(1.0)
    return {}


# ── Live data fetchers ────────────────────────────────────────────────────────

def get_driver_standings(year: int) -> list[dict]:
    """
    Fetch current season driver standings.
    Used as a proxy for driver quality in-season.
    """
    data = safe_get(f"{BASE_URL}/{year}/driverStandings.json")
    lst  = (data.get("MRData", {})
                .get("StandingsTable", {})
                .get("StandingsLists", [{}])[0]
                .get("DriverStandings", []))
    return [
        {
            "driver_id":              s["Driver"]["driverId"],
            "driver_code":            s["Driver"].get("code", s["Driver"]["familyName"][:3].upper()),
            "first_name":             s["Driver"]["givenName"],
            "last_name":              s["Driver"]["familyName"],
            "nationality":            s["Driver"]["nationality"],
            "constructor_id":         s["Constructors"][0]["constructorId"] if s.get("Constructors") else "",
            "constructor":            s["Constructors"][0]["name"]          if s.get("Constructors") else "",
            # Use current standings as "prev season" proxy for in-season predictions
            "driver_prev_season_pts":  float(s.get("points", 0)),
            "driver_prev_season_pos":  int(s.get("position", 20)),
            "driver_prev_season_wins": int(s.get("wins", 0)),
        }
        for s in lst
        if s.get("Driver") and s.get("Constructors")
    ]


def get_constructor_standings(year: int) -> list[dict]:
    data = safe_get(f"{BASE_URL}/{year}/constructorStandings.json")
    lst  = (data.get("MRData", {})
                .get("StandingsTable", {})
                .get("StandingsLists", [{}])[0]
                .get("ConstructorStandings", []))
    return [
        {
            "constructor_id":        s["Constructor"]["constructorId"],
            "constr_prev_season_pts":  float(s.get("points", 0)),
            "constr_prev_season_pos":  int(s.get("position", 10)),
            "constr_prev_season_wins": int(s.get("wins", 0)),
        }
        for s in lst
        if s.get("Constructor")
    ]


def get_recent_driver_results(driver_id: str, year: int, n: int = 10) -> list[dict]:
    """
    Fetch the last `n` completed race results for a driver in a given season.
    Returns list of finish_positions.
    """
    data  = safe_get(f"{BASE_URL}/{year}/drivers/{driver_id}/results.json?limit=50")
    races = (data.get("MRData", {})
                 .get("RaceTable", {})
                 .get("Races", []))
    positions = []
    statuses  = []
    for race in races:
        for r in race.get("Results", []):
            try:
                positions.append(int(r["position"]))
            except (ValueError, KeyError):
                positions.append(20)  # treat as DNF-equivalent
            statuses.append(r.get("status", "Finished"))
    # Return last n
    return list(zip(positions[-n:], statuses[-n:]))


def get_circuit_history_for_driver(driver_id: str, circuit_id: str, current_year: int) -> dict:
    """
    Historical results for a driver at a specific circuit
    (only previous seasons, no current-year leakage).
    """
    data  = safe_get(f"{BASE_URL}/drivers/{driver_id}/circuits/{circuit_id}/results.json?limit=100")
    races = (data.get("MRData", {})
                 .get("RaceTable", {})
                 .get("Races", []))

    positions = []
    for race in races:
        if int(race.get("season", 0)) >= current_year:
            continue  # exclude current season
        for r in race.get("Results", []):
            try:
                positions.append(int(r["position"]))
            except (ValueError, KeyError):
                positions.append(20)

    if not positions:
        return {
            "circuit_avg_finish":  11.0,
            "circuit_appearances": 0,
            "circuit_podium_rate": 0.0,
        }
    return {
        "circuit_avg_finish":  float(np.mean(positions)),
        "circuit_appearances": len(positions),
        "circuit_podium_rate": float(sum(1 for p in positions if p <= 3) / len(positions)),
    }


def get_constructor_recent_form(constructor_id: str, year: int, n: int = 5) -> float:
    """Average best finish for constructor in last n races."""
    data  = safe_get(f"{BASE_URL}/{year}/constructors/{constructor_id}/results.json?limit=50")
    races = (data.get("MRData", {})
                 .get("RaceTable", {})
                 .get("Races", []))

    best_per_race = []
    for race in races:
        positions = []
        for r in race.get("Results", []):
            try:
                positions.append(int(r["position"]))
            except (ValueError, KeyError):
                pass
        if positions:
            best_per_race.append(min(positions))

    if not best_per_race:
        return 6.0
    return float(np.mean(best_per_race[-n:]))


def get_qualifying_order(circuit_id: str, year: int, round_num: int | None = None) -> dict[str, int]:
    """
    Get qualifying results for a specific round.
    Returns {driver_id: quali_position}.
    If not yet available, returns empty dict (will fall back to estimated grid).
    """
    if round_num is None:
        return {}
    data  = safe_get(f"{BASE_URL}/{year}/{round_num}/qualifying.json")
    races = data.get("MRData", {}).get("RaceTable", {}).get("Races", [])
    if not races:
        return {}
    result = {}
    for r in races[0].get("QualifyingResults", []):
        result[r["Driver"]["driverId"]] = int(r["position"])
    return result


# ── Feature assembly ──────────────────────────────────────────────────────────

def assemble_features(
    circuit_id: str,
    year: int,
    round_num: int | None,
    qualifying_grid: dict[str, int],
    verbose: bool = False,
) -> pd.DataFrame:
    """
    Build one feature row per driver for an upcoming race.
    Fetches all necessary data from the Jolpica API.
    """
    if verbose:
        print(f"Fetching driver standings for {year}…")
    drivers      = get_driver_standings(year)
    if not drivers:
        raise ValueError(f"No driver standings available for {year}.")

    if verbose:
        print(f"Fetching constructor standings…")
    constructors = get_constructor_standings(year)
    constr_map   = {c["constructor_id"]: c for c in constructors}

    rows = []
    for drv in drivers:
        driver_id      = drv["driver_id"]
        constructor_id = drv["constructor_id"]

        # ── Grid / qualifying position ─────────────────────────────────────
        if qualifying_grid and driver_id in qualifying_grid:
            grid_pos  = qualifying_grid[driver_id]
            quali_pos = qualifying_grid[driver_id]
        else:
            # Estimate from championship position as fallback
            grid_pos  = min(drv["driver_prev_season_pos"], 20)
            quali_pos = min(drv["driver_prev_season_pos"], 20)

        # ── Constructor standings ──────────────────────────────────────────
        c = constr_map.get(constructor_id, {})
        constr_prev_pts   = c.get("constr_prev_season_pts",  0.0)
        constr_prev_pos   = c.get("constr_prev_season_pos",  10)
        constr_prev_wins  = c.get("constr_prev_season_wins", 0)

        # ── Driver rolling form ────────────────────────────────────────────
        if verbose:
            print(f"  Fetching form for {driver_id}…")
        recent = get_recent_driver_results(driver_id, year, n=10)
        positions_l10 = [p for p, _ in recent]
        statuses_l10  = [s for _, s in recent]
        positions_l5  = positions_l10[-5:]

        def is_dnf(s):
            if not s or s == "Finished":
                return False
            if s.startswith("+") and "Lap" in s:
                return False
            return True

        avg_l5  = float(np.mean(positions_l5))  if positions_l5  else 11.0
        avg_l10 = float(np.mean(positions_l10)) if positions_l10 else 11.0
        dnf_l10 = float(sum(1 for s in statuses_l10 if is_dnf(s)) / max(len(statuses_l10), 1))

        # ── Constructor form ───────────────────────────────────────────────
        constr_avg_l5 = get_constructor_recent_form(constructor_id, year, n=5)

        # ── Circuit history ────────────────────────────────────────────────
        if verbose:
            print(f"  Fetching circuit history for {driver_id} @ {circuit_id}…")
        circuit_hist = get_circuit_history_for_driver(driver_id, circuit_id, year)

        rows.append({
            # Identifiers (not fed to model)
            "driver_id":         driver_id,
            "driver_code":       drv["driver_code"],
            "first_name":        drv["first_name"],
            "last_name":         drv["last_name"],
            "nationality":       drv["nationality"],
            "constructor_id":    constructor_id,
            "constructor":       drv["constructor"],
            # Features
            "grid_position":            grid_pos,
            "quali_position":           quali_pos,
            "driver_prev_season_pts":   drv["driver_prev_season_pts"],
            "driver_prev_season_pos":   drv["driver_prev_season_pos"],
            "driver_prev_season_wins":  drv["driver_prev_season_wins"],
            "constr_prev_season_pts":   constr_prev_pts,
            "constr_prev_season_pos":   constr_prev_pos,
            "constr_prev_season_wins":  constr_prev_wins,
            "driver_avg_finish_l5":     avg_l5,
            "driver_avg_finish_l10":    avg_l10,
            "driver_dnf_rate_l10":      dnf_l10,
            "constr_avg_finish_l5":     constr_avg_l5,
            "circuit_avg_finish":       circuit_hist["circuit_avg_finish"],
            "circuit_appearances":      circuit_hist["circuit_appearances"],
            "circuit_podium_rate":      circuit_hist["circuit_podium_rate"],
            "season_round":             round_num or 1,
            "season_year":              year,
        })
        time.sleep(0.25)  # polite rate limiting

    return pd.DataFrame(rows)


# ── Probability computation ───────────────────────────────────────────────────

def compute_probabilities(
    raw_pred_positions: np.ndarray,
    win_probs_raw: np.ndarray,
    podium_probs_raw: np.ndarray,
) -> tuple[np.ndarray, np.ndarray]:
    """
    Post-process classifier probabilities:
    - Win probabilities: normalise so they sum to 100%, cap at 60%
    - Podium probabilities: cap at 75%, normalise top-3 ≤ 100%
    """
    # Win probs
    win_sum = win_probs_raw.sum()
    win_probs = (win_probs_raw / win_sum * 100) if win_sum > 0 else win_probs_raw * 100
    win_probs = np.clip(win_probs, 0.2, 60.0)
    win_probs = win_probs / win_probs.sum() * 100  # re-normalise

    # Round to 1 decimal
    win_probs = np.round(win_probs, 1)

    # Podium probs (just clip, no forced normalisation — each driver independent)
    pod_probs = np.clip(podium_probs_raw * 100, 0.2, 75.0)
    pod_probs = np.round(pod_probs, 1)

    return win_probs, pod_probs


# ── Public API ────────────────────────────────────────────────────────────────

def predict_race(
    circuit_id: str,
    year: int,
    round_num: int | None = None,
    qualifying_grid: dict[str, int] | None = None,
    verbose: bool = False,
) -> dict:
    """
    Main prediction function.
    
    Args:
        circuit_id:      Ergast circuit ID (e.g. 'monza', 'monaco')
        year:            Season year
        round_num:       Race round number (used for qualifying lookup)
        qualifying_grid: Optional pre-supplied {driver_id: grid_pos} dict
        verbose:         Print progress

    Returns:
        Dict with predictions and metadata
    """
    bundle = load_model()
    regressor    = bundle["regressor"]
    podium_clf   = bundle["podium_clf"]
    win_clf      = bundle["win_clf"]
    clf_imputer  = bundle["clf_imputer"]
    features     = bundle["features"]

    if qualifying_grid is None:
        qualifying_grid = {}

    # ── Assemble features ──────────────────────────────────────────────────────
    df = assemble_features(
        circuit_id=circuit_id,
        year=year,
        round_num=round_num,
        qualifying_grid=qualifying_grid,
        verbose=verbose,
    )

    if df.empty:
        raise ValueError("Could not assemble features — no driver data available.")

    X = df[features]

    # ── Regression: predicted finishing position ───────────────────────────────
    pred_positions = regressor.predict(X)
    # Clip to realistic range
    pred_positions = np.clip(pred_positions, 1.0, 20.0)

    # ── Classification: win and podium probabilities ───────────────────────────
    X_imp = clf_imputer.transform(X)
    win_raw    = win_clf.predict_proba(X_imp)[:, 1]
    podium_raw = podium_clf.predict_proba(X_imp)[:, 1]

    win_probs, pod_probs = compute_probabilities(pred_positions, win_raw, podium_raw)

    # ── Rank drivers by predicted position (ascending) ─────────────────────────
    order = np.argsort(pred_positions)
    df = df.reset_index(drop=True)

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
            # Key features for display
            "championship_pos":    int(row["driver_prev_season_pos"]),
            "championship_pts":    float(row["driver_prev_season_pts"]),
            "season_wins":         int(row["driver_prev_season_wins"]),
            "grid_position":       int(row["grid_position"]),
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
        "model":        "ML — Gradient Boosting / Random Forest",
        "generated_at": pd.Timestamp.utcnow().isoformat() + "Z",
        "predictions":  predictions,
    }


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="F1 ML Prediction")
    parser.add_argument("--circuit", required=True, help="Circuit ID (e.g. monza)")
    parser.add_argument("--year",    type=int, default=2026, help="Season year")
    parser.add_argument("--round",   type=int, default=None, help="Round number")
    parser.add_argument("--verbose", action="store_true")
    args = parser.parse_args()

    result = predict_race(
        circuit_id=args.circuit,
        year=args.year,
        round_num=args.round,
        verbose=args.verbose,
    )

    for p in result["predictions"][:10]:
        print(
            f"P{p['rank']:2d}  {p['name']:<25s}  "
            f"Win: {p['win_probability']:5.1f}%  "
            f"Podium: {p['podium_probability']:5.1f}%  "
            f"Pred pos: {p['predicted_position']:.1f}"
        )
