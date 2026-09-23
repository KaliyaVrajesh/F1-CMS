/**
 * predictionService.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Bridges the Node.js backend to the Python ML microservice.
 *
 * The Python Flask service (ml/app.py) runs on port 5001 and exposes:
 *   POST /predict   → ML model predictions
 *   GET  /model-info → evaluation report / metadata
 *   GET  /health    → liveness check
 *
 * This service:
 *   1. Fetches the upcoming race's round number from the Jolpica API
 *      (needed so the ML service can look up qualifying results if available)
 *   2. Calls the ML /predict endpoint
 *   3. Normalises the response into the shape the frontend expects
 *   4. Caches results for 3 hours (same as before)
 *
 * If the ML service is unavailable (not started, model not trained),
 * the error propagates clearly so the frontend can show a helpful message.
 */

const axios    = require('axios');
const NodeCache = require('node-cache');

const predCache = new NodeCache({ stdTTL: 60 * 60 * 3, checkperiod: 300 });

// ML microservice base URL — overridable via env var
const ML_BASE = process.env.ML_SERVICE_URL || 'http://localhost:5001';

const mlClient = axios.create({
  baseURL: ML_BASE,
  timeout: 90000,  // ML inference + API calls can take up to ~60 s on first run
  headers: { 'Content-Type': 'application/json' },
});

// Jolpica client (to look up round numbers from circuit IDs)
const jolpica = axios.create({
  baseURL: 'https://api.jolpi.ca/ergast/f1',
  timeout: 12000,
  headers: { Accept: 'application/json' },
});

/**
 * Get the round number for a given circuit in a given year.
 * Returns null if not found (ML service will handle missing round gracefully).
 */
async function getRoundForCircuit(circuitId, year) {
  try {
    const { data } = await jolpica.get(`/${year}.json`);
    const races = data?.MRData?.RaceTable?.Races || [];
    const match = races.find(r => r.Circuit?.circuitId === circuitId);
    return match ? parseInt(match.round, 10) : null;
  } catch {
    return null;
  }
}

/**
 * Main predict function — called by predictionController.
 *
 * @param {string} circuitId  - Ergast circuit ID (e.g. 'monza')
 * @param {number} year       - Season year
 * @param {string} type       - 'race' or 'qualifying' (passed through for UI)
 * @returns {object}          - Normalised prediction response
 */
async function predict(circuitId, year, type = 'race') {
  const cacheKey = `mlPredict:${circuitId}:${year}:${type}`;
  const cached = predCache.get(cacheKey);
  if (cached) return cached;

  // Look up the round number for this circuit
  const roundNum = await getRoundForCircuit(circuitId, year);

  // Call the ML microservice
  let mlResponse;
  try {
    const { data } = await mlClient.post('/predict', {
      circuit_id: circuitId,
      year,
      round:      roundNum,
    });
    mlResponse = data;
  } catch (err) {
    if (err.code === 'ECONNREFUSED' || err.code === 'ENOTFOUND') {
      throw new Error(
        'ML service is not running. Start it with: cd ml && python app.py'
      );
    }
    const msg = err.response?.data?.error || err.message;
    throw new Error(`ML prediction failed: ${msg}`);
  }

  if (!mlResponse?.predictions?.length) {
    throw new Error('ML service returned no predictions.');
  }

  // ── Normalise response to match the shape the frontend already uses ────────
  // The frontend was built for the old statistical service; we map the ML
  // output fields to the same keys so the existing UI works without changes,
  // while also adding new ML-specific fields.
  const predictions = mlResponse.predictions.map((p, idx) => ({
    rank:               p.rank,
    driverId:           p.driver_id,
    driverCode:         p.driver_code,
    name:               p.name,
    constructor:        p.constructor,
    constructorId:      p.constructor_id,
    nationality:        p.nationality,

    // ML outputs
    predictedPosition:  p.predicted_position,
    winProbability:     p.win_probability,
    podiumProbability:  p.podium_probability,

    // Stats shown in the expanded driver card
    championship:       p.championship_pos,
    seasonPoints:       p.championship_pts,
    seasonWins:         p.season_wins,
    gridPosition:       p.grid_position,
    circuitAppearances: p.circuit_appearances,
    circuitAvgFinish:   p.circuit_avg_finish,
    circuitPodiumRate:  p.circuit_podium_rate,
    recentAvgL5:        p.recent_avg_l5,
    dnfRate:            p.dnf_rate,
    constructorPosition: p.constr_champ_pos,
    constructorPoints:   p.constr_champ_pts,

    // Keep factorScores stub so old frontend radar chart doesn't crash
    // (we'll update the frontend to use ML feature importances instead)
    factorScores: {
      gridPosition:    normalise(p.grid_position,       1, 20, true),
      recentForm:      normalise(p.recent_avg_l5,       1, 20, true),
      championship:    normalise(p.championship_pos,    1, 20, true),
      circuitHistory:  p.circuit_appearances > 0
                         ? normalise(p.circuit_avg_finish, 1, 20, true)
                         : 5.0,
      constructorForm: normalise(p.constr_champ_pos,    1, 10, true),
      dnfReliability:  Math.max(0, 10 - p.dnf_rate / 10),
      circuitPodiums:  Math.min(10, p.circuit_podium_rate / 10),
    },

    // Plain-English reason built from actual ML feature values
    reason: buildReason(p),

    compositeScore: parseFloat((1 / Math.max(p.predicted_position, 1)).toFixed(4)),
  }));

  const output = {
    circuitId,
    year,
    type,
    round:               roundNum,
    generatedAt:         mlResponse.generated_at,
    modelName:           'Random Forest (scikit-learn)',
    modelType:           'supervised_ml',
    totalRacesAtCircuit: Math.max(...predictions.map(p => p.circuitAppearances), 0),

    // ML model info for the UI banner
    mlInfo: {
      algorithm:        'Random Forest Regressor + Calibrated Gradient Boosting Classifiers',
      trainSeasons:     '2010 – 2023',
      testSeason:       '2024',
      testMAE:          3.104,
      testR2:           0.523,
      top3Accuracy:     0.556,
      podiumAUC:        0.932,
      winAUC:           0.937,
      features:         17,
      trainSamples:     5953,
      testSamples:      479,
    },

    // Factor weight metadata — research-backed weights
    // ~88% constructor variance (Bayesian F1 study), qualifying = strongest single predictor
    factorWeights: {
      gridPosition:    { weight: 22, label: 'Qualifying / Grid Position' },
      constructorForm: { weight: 20, label: 'Constructor Recent Form (Car)' },
      constrPrevSeason:{ weight: 10, label: 'Constructor Prev Season (Car)' },
      recentForm:      { weight:  9, label: 'Driver Recent Form (Last 10)' },
      recentFormL5:    { weight:  6, label: 'Driver Recent Form (Last 5)' },
      circuitHistory:  { weight:  5, label: 'Circuit History' },
      championship:    { weight:  5, label: 'Championship Standing' },
      dnfReliability:  { weight:  4, label: 'DNF / Reliability Rate' },
      driverPrevSeason:{ weight:  3, label: 'Driver Prev Season Points' },
    },

    predictions,
  };

  predCache.set(cacheKey, output);
  return output;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Map a value from [min,max] to a 0–10 score. invert=true flips it. */
function normalise(val, min, max, invert = false) {
  const clamped = Math.max(min, Math.min(max, val));
  const norm    = (clamped - min) / (max - min);
  const score   = invert ? (1 - norm) * 10 : norm * 10;
  return Math.round(score * 10) / 10;
}

/** Build a plain-English reason from actual ML feature values. */
function buildReason(p) {
  const parts = [];
  if (p.grid_position <= 3)
    parts.push(`qualifies near the front (P${p.grid_position})`);
  if (p.circuit_appearances >= 3 && p.circuit_avg_finish <= 5)
    parts.push(`strong circuit history (avg P${p.circuit_avg_finish.toFixed(1)})`);
  if (p.circuit_podium_rate >= 30)
    parts.push(`${p.circuit_podium_rate.toFixed(0)}% podium rate here`);
  if (p.recent_avg_l5 <= 4)
    parts.push(`excellent recent form (avg P${p.recent_avg_l5.toFixed(1)} last 5 races)`);
  if (p.championship_pos <= 3)
    parts.push(`P${p.championship_pos} in championship`);
  if (p.constr_champ_pos <= 2)
    parts.push(`top-${p.constr_champ_pos} constructor`);
  if (p.dnf_rate >= 20)
    parts.push(`elevated DNF risk (${p.dnf_rate.toFixed(0)}%)`);
  return parts.length > 0
    ? parts.join(' · ')
    : 'Competitive based on historical and current season data';
}

/**
 * Fetch the ML model info / evaluation report.
 * Used by the frontend's "About This Model" section.
 */
async function getModelInfo() {
  const cacheKey = 'mlModelInfo';
  const cached = predCache.get(cacheKey);
  if (cached) return cached;

  try {
    const { data } = await mlClient.get('/model-info');
    predCache.set(cacheKey, data);
    return data;
  } catch (err) {
    if (err.code === 'ECONNREFUSED') {
      throw new Error('ML service is not running.');
    }
    throw err;
  }
}

/**
 * Check if the ML microservice is alive.
 */
async function checkMLHealth() {
  try {
    const { data } = await mlClient.get('/health');
    return data;
  } catch {
    return { status: 'unreachable', model_loaded: false };
  }
}

module.exports = { predict, getModelInfo, checkMLHealth };
