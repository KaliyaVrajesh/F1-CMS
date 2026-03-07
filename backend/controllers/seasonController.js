const asyncHandler = require('express-async-handler');
const Season = require('../models/Season');

/**
 * @desc    Get all seasons
 * @route   GET /api/seasons
 * @access  Public
 */
const getSeasons = asyncHandler(async (req, res) => {
  const seasons = await Season.find().populate('races').sort({ year: -1 });
  res.json(seasons);
});

/**
 * @desc    Get single season
 * @route   GET /api/seasons/:year
 * @access  Public
 */
const getSeasonByYear = asyncHandler(async (req, res) => {
  const season = await Season.findOne({ year: req.params.year }).populate({
    path: 'races',
    populate: {
      path: 'results',
      populate: {
        path: 'driver',
        populate: 'team',
      },
    },
  });

  if (season) {
    res.json(season);
  } else {
    res.status(404);
    throw new Error('Season not found');
  }
});

/**
 * @desc    Create new season
 * @route   POST /api/seasons
 * @access  Private/Admin
 */
const createSeason = asyncHandler(async (req, res) => {
  const { year } = req.body;

  if (!year) {
    res.status(400);
    throw new Error('Please add year');
  }

  // Check if season exists
  const seasonExists = await Season.findOne({ year });
  if (seasonExists) {
    res.status(400);
    throw new Error('Season already exists');
  }

  const season = await Season.create({ year });
  res.status(201).json(season);
});

module.exports = {
  getSeasons,
  getSeasonByYear,
  createSeason,
};
