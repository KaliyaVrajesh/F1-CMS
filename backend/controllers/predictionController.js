const asyncHandler = require('express-async-handler');
const { predict } = require('../services/predictionService');

/**
 * GET /api/f1/predict/:circuitId?year=2026&type=race
 * GET /api/f1/predict/:circuitId?year=2026&type=qualifying
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

module.exports = { getPrediction };
