/**
 * F1 Race & Qualifying Prediction Engine v2
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Factor breakdown (weights revised for realism):
 *
 *  Factor                         Weight   Notes
 *  ─────────────────────────────────────────────────────────────────────────
 *  Constructor championship pts    22 %    Car pace dominates F1
 *  Driver recent form (last 5)     20 %    Momentum matters most
 *  Driver championship position    18 %    Season-wide driver quality
 *  Circuit-specific history        15 %    Some tracks suit certain drivers
 *  Constructor recent form         12 %    Team reliability & recent pace
 *  Circuit podium history           8 %    Broader circuit affinity
 *  Season wins                      5 %    Psychological "winning habit"
 *  ─────────────────────────────────────────────────────────────────────────
 *
 * Probability spread fix:
 *  - Softmax temperature k=3 (was 8) — prevents one driver monopolising >60%
 *  - Hard minimum 0.3% per driver   — nobody truly has zero chance
 *  - Hard maximum 45% win chance    — F1 is never that certain
 *
 * Returns per-driver score breakdown so the UI can show factor charts.
 */

const axios = require('axios');
const NodeCache = require('node-cache');

const predCache = new NodeCache({ stdTTL: 60 * 60 * 3, checkperiod: 300 });

const jolpica = axios.create({
  baseURL: 'https://api.jolpi.ca/ergast/f1',
  timeout: 15000,
  headers: { Accept: 'application/json' },
});

// ── HTTP helper ───────────────────────────────────────────────────────────────

async function cachedGet(url) {
  const hit = predCache.get(url);
  if (hit !== undefined) return hit;
  const { data } = await jolpica.get(url);
  predCache.set(url, data);
  return data;
}

// ── Data fetchers ─────────────────────────────────────────────────────────────

/**
 * Circuit race history — top-10 per race, up to 300 entries.
 * Includes recency-weighting data (season) so older results count less.
 */
async function getCircuitHistory(circuitId) {
  const key = `circuitHistory2:${circuitId}`;
  const cached = predCache.get(key);
  if (cached) return cached;

  // Fetch two pages so we get more history
  const [p1, p2] = await Promise.allSettled([
    cachedGet(`/circuits/${circuitId}/results.json?limit=200&offset=0`),
    cachedGet(`/circuits/${circuitId}/results.json?limit=200&offset=200`),
  ]);

  const races1 = p1.status === 'fulfilled' ? (p1.value?.MRData?.RaceTable?.Races || []) : [];
  const races2 = p2.status === 'fulfilled' ? (p2.value?.MRData?.RaceTable?.Races || []) : [];
  const allRaces = [...races1, ...races2];

  const history = [];
  for (const race of allRaces) {
    const yr = parseInt(race.season, 10);
    for (const r of (race.Results || [])) {
      const pos = parseInt(r.position, 10);
      if (pos > 10) break;
      history.push({
        season:        yr,
        driverId:      r.Driver?.driverId,
        constructorId: r.Constructor?.constructorId,
        position:      pos,
        grid:          parseInt(r.grid, 10) || 20,
        points:        parseFloat(r.points) || 0,
      });
    }
  }

  predCache.set(key, history);
  return history;
}

/**
 * Driver standings for the season.
 */
async function getDriverStandings(year) {
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
 * Constructor standings — used as proxy for current car competitiveness.
 */
async function getConstructorStandings(year) {
  const data = await cachedGet(`/${year}/constructorStandings.json`);
  const list = data?.MRData?.StandingsTable?.StandingsLists?.[0]?.ConstructorStandings || [];
  return list.map(s => ({
    constructorId: s.Constructor.constructorId,
    name:          s.Constructor.name,
    points:        parseFloat(s.points),
    wins:          parseInt(s.wins, 10),
    position:      parseInt(s.position, 10),
  }));
}

/**
 * Last N completed races this season.
 * Returns { driverFormMap, constructorFormMap } — weighted by recency.
 */
async function getRecentForm(year, lastN = 5) {
  const key = `recentForm2:${year}:${lastN}`;
  const cached = predCache.get(key);
  if (cached) return cached;

  // Fetch a generous window then slice from the end
  const data = await cachedGet(`/${year}/results.json?limit=100&offset=0`);
  const allRaces = data?.MRData?.RaceTable?.Races || [];
  const total    = parseInt(data?.MRData?.total || '0', 10);

  let races = allRaces;

  // If there are more races, fetch the last page to get the most recent ones
  if (total > 100) {
    const offset = Math.max(0, total - 100);
    const lastData = await cachedGet(`/${year}/results.json?limit=100&offset=${offset}`);
    races = lastData?.MRData?.RaceTable?.Races || allRaces;
  }

  const recentRaces = races.slice(-lastN);

  const driverForm      = {};
  const constructorForm = {};

  recentRaces.forEach((race, idx) => {
    // Most recent race = weight 1.0, oldest = weight 0.2
    const weight = 0.2 + (idx / Math.max(recentRaces.length - 1, 1)) * 0.8;
    for (const r of (race.Results || [])) {
      const did = r.Driver?.driverId;
      const cid = r.Constructor?.constructorId;
      const pts = parseFloat(r.points) || 0;
      if (did) driverForm[did]      = (driverForm[did]      || 0) + pts * weight;
      if (cid) constructorForm[cid] = (constructorForm[cid] || 0) + pts * weight;
    }
  });

  const result = { driverForm, constructorForm };
  predCache.set(key, result);
  return result;
}

// ── Scoring ───────────────────────────────────────────────────────────────────

const CURRENT_YEAR = new Date().getFullYear();
const HISTORY_CUTOFF = CURRENT_YEAR - 8; // 8 seasons of circuit history

/**
 * Compute a [0..1] score for each driver across 7 weighted factors.
 * Returns the full factor breakdown per driver so the UI can chart it.
 */
function scoreDrivers({ driverStandings, constructorStandings, circuitHistory, driverForm, constructorForm }) {
  // Pre-compute normalisation maxima
  const maxDriverPts  = Math.max(...driverStandings.map(d => d.points), 1);
  const maxDriverWins = Math.max(...driverStandings.map(d => d.wins), 1);
  const maxConstrPts  = Math.max(...constructorStandings.map(c => c.points), 1);
  const maxDriverForm = Math.max(...Object.values(driverForm), 1);
  const maxConstrForm = Math.max(...Object.values(constructorForm), 1);

  // Build constructor lookup
  const constrMap = {};
  for (const c of constructorStandings) constrMap[c.constructorId] = c;

  const scores = {};

  for (const driver of driverStandings) {
    const { driverId, constructorId } = driver;
    const constr = constrMap[constructorId];

    // ── 1. Constructor championship points (22%) — car pace ──────────────────
    const constrPtsNorm = constr ? constr.points / maxConstrPts : 0;

    // ── 2. Driver recent form — last 5 races (20%) ────────────────────────────
    const driverFormNorm = (driverForm[driverId] || 0) / maxDriverForm;

    // ── 3. Driver championship position (18%) ─────────────────────────────────
    // Invert: P1 = 1.0, P20 = 0.05
    const champNorm = driver.points / maxDriverPts;

    // ── 4. Circuit-specific driver history (15%) ──────────────────────────────
    const relevant = circuitHistory.filter(
      h => h.driverId === driverId && h.season >= HISTORY_CUTOFF
    );
    // Recency-weighted: recent wins worth more
    let circuitScore = 0;
    for (const h of relevant) {
      const recencyWeight = 0.5 + 0.5 * ((h.season - HISTORY_CUTOFF) / (CURRENT_YEAR - HISTORY_CUTOFF));
      if (h.position === 1) circuitScore += 3.0 * recencyWeight;
      else if (h.position === 2) circuitScore += 1.8 * recencyWeight;
      else if (h.position === 3) circuitScore += 1.2 * recencyWeight;
      else if (h.position <= 5) circuitScore += 0.6 * recencyWeight;
      else if (h.position <= 10) circuitScore += 0.2 * recencyWeight;
    }
    // Normalise by appearances (consistency matters)
    const appearances = relevant.length;
    const circuitNorm = appearances > 0
      ? Math.min(1, circuitScore / (appearances * 2))
      : 0;

    // ── 5. Constructor recent form (12%) ──────────────────────────────────────
    const constrFormNorm = constructorId
      ? (constructorForm[constructorId] || 0) / maxConstrForm
      : 0;

    // ── 6. Circuit podium history (8%) ────────────────────────────────────────
    const podiums   = relevant.filter(h => h.position <= 3).length;
    const podiumRate = appearances > 0 ? podiums / appearances : 0;

    // ── 7. Season wins (5%) ───────────────────────────────────────────────────
    const winsNorm = driver.wins / maxDriverWins;

    // ── Composite ─────────────────────────────────────────────────────────────
    const breakdown = {
      constructorPace: constrPtsNorm,
      recentForm:      driverFormNorm,
      championship:    champNorm,
      circuitHistory:  circuitNorm,
      constructorForm: constrFormNorm,
      circuitPodiums:  podiumRate,
      seasonWins:      winsNorm,
    };

    const total =
      breakdown.constructorPace * 0.22 +
      breakdown.recentForm      * 0.20 +
      breakdown.championship    * 0.18 +
      breakdown.circuitHistory  * 0.15 +
      breakdown.constructorForm * 0.12 +
      breakdown.circuitPodiums  * 0.08 +
      breakdown.seasonWins      * 0.05;

    const circuitWins   = relevant.filter(h => h.position === 1).length;
    const circuitPodiums = relevant.filter(h => h.position <= 3).length;

    scores[driverId] = {
      total,
      breakdown,
      circuitWins,
      circuitPodiums,
      circuitAppearances: appearances,
      recentFormRaw: driverForm[driverId] || 0,
      constructorPoints: constr?.points || 0,
      constructorPosition: constr?.position || 99,
    };
  }

  return scores;
}

/**
 * Convert raw scores to probability % with realistic spread.
 *
 * Using temperature-controlled softmax:
 *  - k=3  (was 8) → much flatter distribution, no single driver > ~40%
 *  - Hard floor: every driver gets at least 0.3%
 *  - Hard cap:   no driver exceeds 45%
 */
function toProbabilities(scores) {
  const MIN_PROB = 0.3;
  const MAX_PROB = 45.0;
  const k = 3;

  const exps = {};
  for (const [id, s] of Object.entries(scores)) {
    exps[id] = Math.exp(k * s.total);
  }
  const expTotal = Object.values(exps).reduce((a, b) => a + b, 0);

  // Raw softmax
  const raw = {};
  for (const [id, e] of Object.entries(exps)) {
    raw[id] = (e / expTotal) * 100;
  }

  // Apply floor & cap
  const probs = {};
  for (const [id, p] of Object.entries(raw)) {
    probs[id] = Math.max(MIN_PROB, Math.min(MAX_PROB, p));
  }

  // Re-normalise so they still sum to ~100
  const probTotal = Object.values(probs).reduce((a, b) => a + b, 0);
  for (const id of Object.keys(probs)) {
    probs[id] = Math.round((probs[id] / probTotal) * 1000) / 10;
  }

  return probs;
}

/**
 * Build a plain-English reason string for each driver.
 */
function buildReason(driver, meta, constrName, isQualifying) {
  const parts = [];

  if (meta.constructorPosition <= 3) {
    parts.push(`${constrName || 'their team'} is a top-${meta.constructorPosition} constructor`);
  }
  if (meta.circuitWins > 0) {
    parts.push(`${meta.circuitWins} historical win${meta.circuitWins > 1 ? 's' : ''} at this circuit`);
  }
  if (meta.circuitPodiums > meta.circuitWins && meta.circuitPodiums > 0) {
    parts.push(`${meta.circuitPodiums} podiums here`);
  }
  if (driver.wins > 0) {
    parts.push(`${driver.wins} win${driver.wins > 1 ? 's' : ''} this season`);
  }
  if (driver.position <= 3) {
    parts.push(`P${driver.position} in the drivers' championship`);
  }
  if (isQualifying && meta.circuitPodiums > 0) {
    parts.push('strong qualifying pace at this venue');
  }

  return parts.length > 0
    ? parts.join(' · ')
    : 'Competitive package expected based on current season data';
}

// ── Public API ────────────────────────────────────────────────────────────────

async function predict(circuitId, year = new Date().getFullYear(), type = 'race') {
  const cacheKey = `predict2:${circuitId}:${year}:${type}`;
  const cached = predCache.get(cacheKey);
  if (cached) return cached;

  // Fetch all data in parallel
  const [driverStandings, constructorStandings, circuitHistory, formData] = await Promise.all([
    getDriverStandings(year),
    getConstructorStandings(year),
    getCircuitHistory(circuitId),
    getRecentForm(year, 5),
  ]);

  if (driverStandings.length === 0) {
    throw new Error(`No driver standings data for ${year}. Season may not have started yet.`);
  }

  const { driverForm, constructorForm } = formData;

  const rawScores = scoreDrivers({
    driverStandings,
    constructorStandings,
    circuitHistory,
    driverForm,
    constructorForm,
  });

  const probs = toProbabilities(rawScores);

  // Build constructor lookup for names
  const constrMap = {};
  for (const c of constructorStandings) constrMap[c.constructorId] = c;

  const result = driverStandings
    .filter(d => rawScores[d.driverId])
    .map(driver => {
      const meta    = rawScores[driver.driverId];
      const constr  = constrMap[driver.constructorId];
      const winProb = probs[driver.driverId] || 0;

      // Factor scores scaled to 0–10 for display
      const factorScores = {
        constructorPace: Math.round(meta.breakdown.constructorPace * 10 * 10) / 10,
        recentForm:      Math.round(meta.breakdown.recentForm      * 10 * 10) / 10,
        championship:    Math.round(meta.breakdown.championship    * 10 * 10) / 10,
        circuitHistory:  Math.round(meta.breakdown.circuitHistory  * 10 * 10) / 10,
        constructorForm: Math.round(meta.breakdown.constructorForm * 10 * 10) / 10,
        circuitPodiums:  Math.round(meta.breakdown.circuitPodiums  * 10 * 10) / 10,
        seasonWins:      Math.round(meta.breakdown.seasonWins      * 10 * 10) / 10,
      };

      return {
        rank:                0,
        driverId:            driver.driverId,
        driverCode:          driver.driverCode || driver.lastName?.slice(0, 3).toUpperCase(),
        name:                `${driver.firstName} ${driver.lastName}`,
        constructor:         driver.constructor,
        constructorId:       driver.constructorId,
        constructorPoints:   meta.constructorPoints,
        constructorPosition: meta.constructorPosition,
        nationality:         driver.nationality,
        championship:        driver.position,
        seasonPoints:        driver.points,
        seasonWins:          driver.wins,
        circuitWins:         meta.circuitWins,
        circuitPodiums:      meta.circuitPodiums,
        circuitAppearances:  meta.circuitAppearances,
        recentFormScore:     Math.round(meta.recentFormRaw * 10) / 10,
        winProbability:      winProb,
        podiumProbability:   Math.min(65, winProb * 2.4),
        factorScores,
        compositeScore:      Math.round(meta.total * 1000) / 1000,
        reason:              buildReason(driver, meta, driver.constructor, type === 'qualifying'),
      };
    })
    .sort((a, b) => b.winProbability - a.winProbability)
    .map((d, i) => ({ ...d, rank: i + 1 }));

  // Re-normalise podium probs so top-3 sums ≤ 100%
  const podTotal = result.slice(0, 3).reduce((s, d) => s + d.podiumProbability, 0);
  if (podTotal > 100) {
    const scale = 98 / podTotal;
    result.slice(0, 3).forEach(d => {
      d.podiumProbability = Math.round(d.podiumProbability * scale * 10) / 10;
    });
  }

  // Factor weight metadata for the UI to display
  const factorWeights = {
    constructorPace: { weight: 22, label: 'Car Pace (Constructor)' },
    recentForm:      { weight: 20, label: 'Recent Form (Last 5)' },
    championship:    { weight: 18, label: 'Championship Standing' },
    circuitHistory:  { weight: 15, label: 'Circuit History' },
    constructorForm: { weight: 12, label: 'Constructor Recent Form' },
    circuitPodiums:  { weight: 8,  label: 'Circuit Podium Rate' },
    seasonWins:      { weight: 5,  label: 'Season Wins' },
  };

  const output = {
    circuitId,
    year,
    type,
    generatedAt: new Date().toISOString(),
    totalRacesAtCircuit: new Set(circuitHistory.map(h => h.season)).size,
    factorWeights,
    predictions: result,
  };

  predCache.set(cacheKey, output);
  return output;
}

module.exports = { predict };
