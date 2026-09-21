const asyncHandler = require('express-async-handler');
const { predict, getModelInfo, checkMLHealth } = require('../services/predictionService');

/**
 * GET /api/f1/predict/:circuitId?year=2026&type=race|qualifying
 * Calls the Python ML microservice and returns predictions.
 */
const getPrediction = asyncHandler(async (req, res) => {
  const { circuitId } = req.params;
  const year = parseInt(req.query.year, 10) || new Date().getFullYear();
  const type = req.query.type === 'qualifying' ? 'qualifying' : 'race';

  if (!circuitId) {
    res.status(400);
    throw new Error('circuitId is required');
  }

  const data = await predict(circuitId, year, type);
  res.json(data);
});

/**
 * GET /api/f1/predict/model-info
 * Returns the ML model evaluation report (MAE, R², AUC, feature importances).
 */
const getMLModelInfo = asyncHandler(async (req, res) => {
  const data = await getModelInfo();
  res.json(data);
});

/**
 * GET /api/f1/predict/health
 * Checks whether the ML microservice is running and the model is loaded.
 */
const getMLHealth = asyncHandler(async (req, res) => {
  const data = await checkMLHealth();
  res.json(data);
});

module.exports = { getPrediction, getMLModelInfo, getMLHealth };
