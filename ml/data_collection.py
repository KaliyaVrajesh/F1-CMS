"""
data_collection.py
──────────────────
Fetches historical F1 race data from the Jolpica/Ergast API.

Rate-limit-safe strategy:
  - Per-season race results   : 1–2 requests per season
  - Per-season qualifying     : 1 request per season
  - Season-level standings    : 1 request per season (end-of-season snapshot)
  - Between seasons           : 3-second pause
  - All requests              : exponential back-off on 429, up to 5 retries
  - Min delay between calls   : 1.0 second

This keeps total requests to ~45 for 15 seasons, well within limits.
"""

import requests
import pandas as pd
import time
import os

BASE_URL = "https://api.jolpi.ca/ergast/f1"
DATA_DIR = os.path.join(os.path.dirname(__file__), "data")
os.makedirs(DATA_DIR, exist_ok=True)

# ── Polite HTTP helper ────────────────────────────────────────────────────────

def safe_get(url: str, retries: int = 5) -> dict:
    """
    Fetch JSON with exponential back-off on 429/5xx.
    Waits 1 second minimum between calls (called before every request).
    """
    for attempt in range(retries):
        try:
            time.sleep(1.0)            # always wait at least 1 s
            resp = requests.get(url, timeout=25)
            if resp.status_code == 429:
                wait = 4 * (2 ** attempt)   # 4, 8, 16, 32, 64 s
                print(f"  [429] Rate limited. Waiting {wait}s before retry {attempt+1}/{retries}…")
                time.sleep(wait)
                continue
            resp.raise_for_status()
            return resp.json()
        except requests.exceptions.HTTPError as exc:
            if attempt < retries - 1:
                wait = 3 * (2 ** attempt)
                print(f"  [HTTP {exc.response.status_code}] Retry {attempt+1}/{retries} in {wait}s")
                time.sleep(wait)
            else:
                print(f"  [!] Giving up on {url}: {exc}")
                return {}
        except Exception as exc:
            if attempt < retries - 1:
                time.sleep(2 * (attempt + 1))
            else:
                print(f"  [!] Giving up on {url}: {exc}")
                return {}
    return {}


# ── Data fetchers ─────────────────────────────────────────────────────────────

def fetch_season_results(year: int) -> list[dict]:
    """
    All race results for a season (paginated, max 2 requests).
    Returns flat list of per-driver-per-race records.
    """
    url  = f"{BASE_URL}/{year}/results.json?limit=100&offset=0"
    data = safe_get(url)
    total = int(data.get("MRData", {}).get("total", 0))
    races = data.get("MRData", {}).get("RaceTable", {}).get("Races", [])

    if total > 100:
        for offset in range(100, total, 100):
            extra = safe_get(f"{BASE_URL}/{year}/results.json?limit=100&offset={offset}")
            races += extra.get("MRData", {}).get("RaceTable", {}).get("Races", [])

    records = []
    for race in races:
        for r in race.get("Results", []):
            try:
                records.append({
                    "season":          int(race["season"]),
                    "round":           int(race["round"]),
                    "race_name":       race["raceName"],
                    "circuit_id":      race["Circuit"]["circuitId"],
                    "race_date":       race["date"],
                    "driver_id":       r["Driver"]["driverId"],
                    "driver_code":     r["Driver"].get("code", ""),
                    "constructor_id":  r["Constructor"]["constructorId"],
                    "finish_position": int(r["position"]),
                    "grid_position":   int(r.get("grid") or 20),
                    "status":          r.get("status", "Finished"),
                    "points":          float(r.get("points", 0)),
                })
            except (KeyError, ValueError, TypeError):
                continue
    return records


def fetch_qualifying_results(year: int) -> list[dict]:
    """Qualifying grid positions for every race in a season (1 request)."""
    data  = safe_get(f"{BASE_URL}/{year}/qualifying.json?limit=500")
    races = data.get("MRData", {}).get("RaceTable", {}).get("Races", [])
    records = []
    for race in races:
        for r in race.get("QualifyingResults", []):
            try:
                records.append({
                    "season":       int(race["season"]),
                    "round":        int(race["round"]),
                    "driver_id":    r["Driver"]["driverId"],
                    "quali_position": int(r["position"]),
                })
            except (KeyError, ValueError, TypeError):
                continue
    return records


def fetch_season_driver_standings(year: int) -> list[dict]:
    """
    END-of-season driver standings (one API call per season).
    Used as a season-level feature; per-round snapshots would require
    ~20 requests/season and hit rate limits.
    """
    data = safe_get(f"{BASE_URL}/{year}/driverStandings.json")
    lst  = (data.get("MRData", {})
                .get("StandingsTable", {})
                .get("StandingsLists", [{}])[0]
                .get("DriverStandings", []))
    records = []
    for s in lst:
        try:
            records.append({
                "season":              int(year),
                "driver_id":           s["Driver"]["driverId"],
                "driver_final_pts":    float(s.get("points", 0)),
                "driver_final_pos":    int(s.get("position", 20)),
                "driver_season_wins":  int(s.get("wins", 0)),
                "constructor_id_drv":  s["Constructors"][0]["constructorId"] if s.get("Constructors") else "",
            })
        except (KeyError, ValueError, TypeError):
            continue
    return records


def fetch_season_constructor_standings(year: int) -> list[dict]:
    """END-of-season constructor standings (one API call per season)."""
    data = safe_get(f"{BASE_URL}/{year}/constructorStandings.json")
    lst  = (data.get("MRData", {})
                .get("StandingsTable", {})
                .get("StandingsLists", [{}])[0]
                .get("ConstructorStandings", []))
    records = []
    for s in lst:
        try:
            records.append({
                "season":                int(year),
                "constructor_id":        s["Constructor"]["constructorId"],
                "constr_final_pts":      float(s.get("points", 0)),
                "constr_final_pos":      int(s.get("position", 10)),
                "constr_season_wins":    int(s.get("wins", 0)),
            })
        except (KeyError, ValueError, TypeError):
            continue
    return records


# ── Main collection loop ──────────────────────────────────────────────────────

def collect_seasons(start_year: int = 2010, end_year: int = 2024) -> None:
    """
    Fetches 4 API calls per season:
      1. Race results
      2. Qualifying results
      3. Driver standings (end-of-season)
      4. Constructor standings (end-of-season)

    Total: ~60 requests for 15 seasons. With 1s minimum delay + 3s
    inter-season pause that's ~90 seconds — well within rate limits.
    """
    all_results    = []
    all_qualifying = []
    all_drv_stand  = []
    all_con_stand  = []

    for year in range(start_year, end_year + 1):
        print(f"\n── {year} ────────────────────────────────")

        print(f"  Race results…")
        yr_results = fetch_season_results(year)
        if not yr_results:
            print(f"  No race data for {year}, skipping.")
            continue
        all_results.extend(yr_results)
        print(f"  ✓ {len(yr_results)} driver-race records")

        print(f"  Qualifying results…")
        yr_quali = fetch_qualifying_results(year)
        all_qualifying.extend(yr_quali)
        print(f"  ✓ {len(yr_quali)} qualifying records")

        print(f"  Driver standings (end-of-season)…")
        yr_drv = fetch_season_driver_standings(year)
        all_drv_stand.extend(yr_drv)
        print(f"  ✓ {len(yr_drv)} driver standing entries")

        print(f"  Constructor standings (end-of-season)…")
        yr_con = fetch_season_constructor_standings(year)
        all_con_stand.extend(yr_con)
        print(f"  ✓ {len(yr_con)} constructor standing entries")

        print(f"  Pausing 3 s before next season…")
        time.sleep(3.0)

    # ── Save ──────────────────────────────────────────────────────────────────
    pd.DataFrame(all_results).to_csv(   f"{DATA_DIR}/raw_results.csv",               index=False)
    pd.DataFrame(all_qualifying).to_csv(f"{DATA_DIR}/raw_qualifying.csv",             index=False)
    pd.DataFrame(all_drv_stand).to_csv( f"{DATA_DIR}/raw_driver_standings.csv",       index=False)
    pd.DataFrame(all_con_stand).to_csv( f"{DATA_DIR}/raw_constructor_standings.csv",  index=False)

    print(f"\n✅ Data collection complete.")
    print(f"   Race records:           {len(all_results)}")
    print(f"   Qualifying records:     {len(all_qualifying)}")
    print(f"   Driver standings rows:  {len(all_drv_stand)}")
    print(f"   Constructor stand rows: {len(all_con_stand)}")
    print(f"   Saved to: {DATA_DIR}/")


if __name__ == "__main__":
    collect_seasons(start_year=2010, end_year=2024)
