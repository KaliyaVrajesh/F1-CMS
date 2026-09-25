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
  const cacheKey = `mlPredict:v3:${circuitId}:${year}:${type}`;
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
      type,
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
  // Map ML output fields to the keys expected by frontend components
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
    reason: buildReason(p, type),

    compositeScore: parseFloat((1 / Math.max(p.predicted_position, 1)).toFixed(4)),
  }));

  const output = {
    circuitId,
    year,
    type,
    round:               roundNum,
    generatedAt:         mlResponse.generated_at,
    modelName:           mlResponse.model || 'Hybrid CatBoost-LightGBM Ensemble',
    modelType:           'supervised_ml',
    totalRacesAtCircuit: Math.max(...predictions.map(p => p.circuitAppearances), 0),

    // ML model info for the UI banner
    mlInfo: {
      algorithm:        'Hybrid CatBoost-LightGBM Ensemble + Calibrated Classifiers',
      trainSeasons:     '2010 – 2023',
      testSeason:       '2024',
      testMAE:          2.747,
      testR2:           0.545,
      top1Accuracy:     0.500,
      top3Accuracy:     0.681,
      top5MAE:          1.731,
      podiumAUC:        0.9466,
      winAUC:           0.9436,
      features:         20,
      trainSamples:     5513,
      testSamples:      479,
    },

    // Factor weight metadata — research-backed weights
    // Qualifying is by far the heaviest predictor of race results
    factorWeights: {
      gridPosition:    { weight: 29, label: 'Qualifying / Grid Position' },
      constructorForm: { weight: 20, label: 'Constructor Car Pace (Upgrades)' },
      recentForm:      { weight: 15, label: 'Driver Recent Form (Last 10)' },
      recentFormL5:    { weight: 10, label: 'Driver Momentum (Last 5)' },
      championship:    { weight:  8, label: 'Current Championship Standing' },
      circuitHistory:  { weight:  7, label: 'Circuit Track Record' },
      dnfReliability:  { weight:  5, label: 'DNF / Mechanical Reliability' },
      constrPrevSeason:{ weight:  4, label: 'Constructor Regulation History' },
      driverPrevSeason:{ weight:  2, label: 'Driver Prior Points' },
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
function buildReason(p, type = 'race') {
  const parts = [];
  if (type === 'qualifying') {
    if (p.rank <= 3)
      parts.push(`front-row qualifying contender (P${p.rank})`);
    if (p.recent_avg_l5 <= 4)
      parts.push(`strong one-lap momentum (avg P${p.recent_avg_l5.toFixed(1)} last 5)`);
    if (p.constr_champ_pos <= 2)
      parts.push(`top-tier constructor package`);
    if (p.circuit_podium_rate >= 30)
      parts.push(`${p.circuit_podium_rate.toFixed(0)}% podium rate at this track`);
  } else {
    if (p.grid_position === 1)
      parts.push(`starts from POLE position (P1)`);
    else if (p.grid_position <= 3)
      parts.push(`prime front-running grid slot (P${p.grid_position})`);
    else if (p.grid_position <= 6)
      parts.push(`starting in top 6 on grid (P${p.grid_position})`);
    else if (p.grid_position >= 15 && p.constr_champ_pos <= 3)
      parts.push(`starting out of position (P${p.grid_position}) with high recovery potential`);

    if (p.circuit_appearances >= 3 && p.circuit_avg_finish <= 5)
      parts.push(`strong track record (avg P${p.circuit_avg_finish.toFixed(1)})`);
    if (p.recent_avg_l5 <= 4)
      parts.push(`excellent recent form (avg P${p.recent_avg_l5.toFixed(1)} last 5)`);
    if (p.dnf_rate >= 20)
      parts.push(`elevated DNF risk (${p.dnf_rate.toFixed(0)}%)`);
  }
  return parts.length > 0
    ? parts.join(' · ')
    : 'Competitive based on track performance and machine learning modeling';
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
