const asyncHandler = require('express-async-handler');
const Driver = require('../models/Driver');
const Constructor = require('../models/Constructor');
const Season = require('../models/Season');

/**
 * @desc    Get driver standings for a season
 * @route   GET /api/standings/drivers/:seasonYear
 * @access  Public
 */
const getDriverStandings = asyncHandler(async (req, res) => {
  const { seasonYear } = req.params;

  const season = await Season.findOne({ year: seasonYear });
  if (!season) {
    res.status(404);
    throw new Error('Season not found');
  }

  const drivers = await Driver.find()
    .populate('team', 'name country')
    .sort({ points: -1, wins: -1, podiums: -1 });

  res.json(drivers);
});

/**
 * @desc    Get constructor standings for a season
 * @route   GET /api/standings/constructors/:seasonYear
 * @access  Public
 */
const getConstructorStandings = asyncHandler(async (req, res) => {
  const { seasonYear } = req.params;

  const season = await Season.findOne({ year: seasonYear });
  if (!season) {
    res.status(404);
    throw new Error('Season not found');
  }

  const constructors = await Constructor.find().sort({ points: -1 });

  res.json(constructors);
});

module.exports = {
  getDriverStandings,
  getConstructorStandings,
};
