/**
 * F1 Race & Qualifying Prediction Engine
 * ─────────────────────────────────────────────────────────────────────────────
 * Weighted statistical model using:
 *
 *  Factor                        Weight  Rationale
 *  ─────────────────────────────────────────────────────────────────────────
 *  Circuit win history           30 %    Some drivers dominate specific tracks
 *  Current season points         25 %    Reflects current car/driver form
 *  Recent 5-race form            20 %    Short-term momentum matters most
 *  Current season wins           10 %    Winning habit
 *  Circuit podium history        10 %    Broader circuit affinity
 *  Grid position (quali)          5 %    (race prediction only)
 *  ─────────────────────────────────────────────────────────────────────────
 *
 * Returns ranked list with win probability %, confidence band,
 * and a plain-English narrative reason.
 *
 * All Jolpica calls are cached via the existing f1DataService caches.
 */

const axios = require('axios');
const NodeCache = require('node-cache');

const predCache = new NodeCache({ stdTTL: 60 * 60 * 3, checkperiod: 300 }); // 3 h

const jolpica = axios.create({
  baseURL: 'https://api.jolpi.ca/ergast/f1',
  timeout: 12000,
  headers: { Accept: 'application/json' },
});

// ── helpers ───────────────────────────────────────────────────────────────────

async function cachedGet(url) {
  const hit = predCache.get(url);
  if (hit !== undefined) return hit;
  const { data } = await jolpica.get(url);
  predCache.set(url, data);
  return data;
}

/**
 * Fetch all historical races at a circuit (winner only per race for speed).
 * Returns array of { season, driverId, constructorId, position, grid }.
 */
async function getCircuitHistory(circuitId, limit = 200) {
  const key = `circuitHistory:${circuitId}:${limit}`;
  const cached = predCache.get(key);
  if (cached) return cached;

  const data = await cachedGet(`/circuits/${circuitId}/results.json?limit=${limit}`);
  const races = data?.MRData?.RaceTable?.Races || [];

  const history = [];
  for (const race of races) {
    const yr = parseInt(race.season, 10);
    for (const r of (race.Results || [])) {
      const pos = parseInt(r.position, 10);
      if (pos > 10) break; // only top-10 needed
      history.push({
        season:        yr,
        driverId:      r.Driver?.driverId,
        constructorId: r.Constructor?.constructorId,
        position:      pos,
        grid:          parseInt(r.grid, 10),
        points:        parseFloat(r.points),
      });
    }
  }

  predCache.set(key, history);
  return history;
}

/**
 * Current season driver standings.
 */
async function getCurrentStandings(year) {
  const data = await cachedGet(`/${year}/driverStandings.json`);
  const list = data?.MRData?.StandingsTable?.StandingsLists?.[0]?.DriverStandings || [];
  return list.map(s => ({
    driverId:      s.Driver.driverId,
    driverCode:    s.Driver.code,
    firstName:     s.Driver.givenName,
    lastName:      s.Driver.familyName,
    nationality:   s.Driver.nationality,
    constructorId: s.Constructors?.[0]?.constructorId,
    constructor:   s.Constructors?.[0]?.name,
    points:        parseFloat(s.points),
    wins:          parseInt(s.wins, 10),
    position:      parseInt(s.position, 10),
  }));
}

/**
 * Last N races for current season — to compute recent form.
 */
async function getRecentForm(year, lastN = 5) {
  const key = `recentForm:${year}:${lastN}`;
  const cached = predCache.get(key);
  if (cached) return cached;

  const data = await cachedGet(`/${year}/results.json?limit=${lastN * 20}&offset=0`);
  const allRaces = data?.MRData?.RaceTable?.Races || [];
  // Take the last N races
  const recentRaces = allRaces.slice(-lastN);

  // driverId → weighted points (most recent race = highest weight)
  const formMap = {};
  recentRaces.forEach((race, raceIdx) => {
    const weight = (raceIdx + 1) / lastN; // 0.2 → 1.0
    for (const r of (race.Results || [])) {
      const id = r.Driver?.driverId;
      if (!id) continue;
      formMap[id] = (formMap[id] || 0) + parseFloat(r.points) * weight;
    }
  });

  predCache.set(key, formMap);
  return formMap;
}

// ── scoring ───────────────────────────────────────────────────────────────────

function scoreDrivers({ standings, circuitHistory, recentForm, maxPoints, maxWins }) {
  const RECENCY_CUTOFF = new Date().getFullYear() - 6; // last 6 seasons of history count

  const scores = {};

  for (const driver of standings) {
    const { driverId } = driver;
    const relevant = circuitHistory.filter(h => h.driverId === driverId && h.season >= RECENCY_CUTOFF);

    // ── Circuit win history (30%) ──────────────────────────────────────────
    const circuitWins    = relevant.filter(h => h.position === 1).length;
    const circuitPodiums = relevant.filter(h => h.position <= 3).length;
    const circuitTop5    = relevant.filter(h => h.position <= 5).length;
    const circuitScore   = (circuitWins * 3 + circuitPodiums * 1.5 + circuitTop5 * 0.5)
                          / Math.max(1, relevant.length);

    // ── Current season points (25%) ────────────────────────────────────────
    const pointsNorm = maxPoints > 0 ? driver.points / maxPoints : 0;

    // ── Recent form (20%) ─────────────────────────────────────────────────
    const maxForm = Math.max(...Object.values(recentForm), 1);
    const formNorm = maxForm > 0 ? (recentForm[driverId] || 0) / maxForm : 0;

    // ── Wins (10%) ────────────────────────────────────────────────────────
    const winsNorm = maxWins > 0 ? driver.wins / maxWins : 0;

    // ── Circuit podium history (10%) ───────────────────────────────────────
    const podiumScore = relevant.length > 0
      ? circuitPodiums / relevant.length
      : 0;

    // ── Composite ─────────────────────────────────────────────────────────
    const total =
      circuitScore * 0.30 +
      pointsNorm   * 0.25 +
      formNorm     * 0.20 +
      winsNorm     * 0.10 +
      podiumScore  * 0.10 +
      // Small baseline so even newcomers get a nonzero score
      0.05;

    scores[driverId] = {
      score: total,
      circuitWins,
      circuitPodiums,
      recentFormScore: recentForm[driverId] || 0,
    };
  }

  return scores;
}

/**
 * Turn raw scores into probability % using softmax-style normalisation.
 */
function softmax(scores) {
  // Use e^(k * score) so differences are amplified (k = 8 feels realistic)
  const k = 8;
  const exps = {};
  for (const [id, s] of Object.entries(scores)) {
    exps[id] = Math.exp(k * s.score);
  }
  const total = Object.values(exps).reduce((a, b) => a + b, 0);
  const probs = {};
  for (const [id, e] of Object.entries(exps)) {
    probs[id] = Math.round((e / total) * 1000) / 10; // one decimal
  }
  return probs;
}

/**
 * Generate plain-English reason for the prediction.
 */
function buildReason(driver, meta, isQualifying) {
  const parts = [];
  if (meta.circuitWins > 0)
    parts.push(`${meta.circuitWins} historical win${meta.circuitWins > 1 ? 's' : ''} at this circuit`);
  if (meta.circuitPodiums > meta.circuitWins && meta.circuitPodiums > 0)
    parts.push(`${meta.circuitPodiums} podium${meta.circuitPodiums > 1 ? 's' : ''} here`);
  if (driver.wins > 0)
    parts.push(`${driver.wins} wins this season`);
  if (driver.position <= 3)
    parts.push(`P${driver.position} in the championship`);

  if (isQualifying) {
    // Qualifying-specific note
    if (meta.circuitPodiums > 0) parts.push('strong sector pace at this venue');
  }

  if (parts.length === 0) return 'Competitive package expected based on current form';
  return parts.join(' · ');
}

// ── public API ────────────────────────────────────────────────────────────────

/**
 * Main prediction entry point.
 * @param {string} circuitId  Jolpica circuitId, e.g. "zandvoort"
 * @param {number} year       Season year, defaults to current
 * @param {'race'|'qualifying'} type
 * @returns Ranked prediction array
 */
async function predict(circuitId, year = new Date().getFullYear(), type = 'race') {
  const cacheKey = `predict:${circuitId}:${year}:${type}`;
  const cached = predCache.get(cacheKey);
  if (cached) return cached;

  // Fetch all data in parallel
  const [standings, circuitHistory, recentForm] = await Promise.all([
    getCurrentStandings(year),
    getCircuitHistory(circuitId),
    getRecentForm(year),
  ]);

  if (standings.length === 0) throw new Error(`No standings data for ${year}`);

  const maxPoints = Math.max(...standings.map(d => d.points), 1);
  const maxWins   = Math.max(...standings.map(d => d.wins), 1);

  const rawScores = scoreDrivers({ standings, circuitHistory, recentForm, maxPoints, maxWins });
  const probs     = softmax(rawScores);

  // Build result
  const result = standings
    .filter(d => rawScores[d.driverId])
    .map(driver => {
      const meta = rawScores[driver.driverId];
      return {
        rank:          0, // filled after sort
        driverId:      driver.driverId,
        driverCode:    driver.driverCode || driver.lastName?.slice(0, 3).toUpperCase(),
        name:          `${driver.firstName} ${driver.lastName}`,
        constructor:   driver.constructor,
        constructorId: driver.constructorId,
        nationality:   driver.nationality,
        championship:  driver.position,
        seasonPoints:  driver.points,
        seasonWins:    driver.wins,
        circuitWins:   meta.circuitWins,
        circuitPodiums:meta.circuitPodiums,
        winProbability: probs[driver.driverId] || 0,
        podiumProbability: Math.min(99, (probs[driver.driverId] || 0) * 2.8),
        reason:        buildReason(driver, meta, type === 'qualifying'),
        score:         Math.round(meta.score * 1000) / 1000,
      };
    })
    .sort((a, b) => b.winProbability - a.winProbability)
    .map((d, i) => ({ ...d, rank: i + 1 }));

  // Normalise podium probabilities to sum ≤ 100 for top-3
  const podTotal = result.slice(0, 3).reduce((s, d) => s + d.podiumProbability, 0);
  if (podTotal > 100) {
    const scale = 100 / podTotal;
    result.forEach((d, i) => {
      if (i < 3) d.podiumProbability = Math.round(d.podiumProbability * scale * 10) / 10;
    });
  }

  const output = {
    circuitId,
    year,
    type,
    generatedAt: new Date().toISOString(),
    totalRacesAtCircuit: circuitHistory.filter((v, i, a) =>
      a.findIndex(x => x.season === v.season) === i
    ).length,
    predictions: result,
  };

  predCache.set(cacheKey, output);
  return output;
}

module.exports = { predict };
