const asyncHandler = require('express-async-handler');
const Race = require('../models/Race');
const Season = require('../models/Season');
const RaceResult = require('../models/RaceResult');
const Driver = require('../models/Driver');
const Constructor = require('../models/Constructor');
const { getPointsForPosition, isPodium, isWin } = require('../services/pointsService');

/**
 * @desc    Get all races
 * @route   GET /api/races
 * @access  Public
 */
const getRaces = asyncHandler(async (req, res) => {
  const races = await Race.find()
    .populate('season')
    .populate({
      path: 'results',
      populate: {
        path: 'driver',
        populate: 'team',
      },
    })
    .sort({ date: -1 });
  res.json(races);
});

/**
 * @desc    Create new race
 * @route   POST /api/races
 * @access  Private/Admin
 */
const createRace = asyncHandler(async (req, res) => {
  const { name, circuit, date, seasonYear, latitude, longitude, circuitCountry, circuitCity, trackSvg } = req.body;

  if (!name || !circuit || !date || !seasonYear) {
    res.status(400);
    throw new Error('Please add all fields');
  }

  // Validate coordinates if provided
  if (latitude !== undefined && (latitude < -90 || latitude > 90)) {
    res.status(400);
    throw new Error('Latitude must be between -90 and 90');
  }
  if (longitude !== undefined && (longitude < -180 || longitude > 180)) {
    res.status(400);
    throw new Error('Longitude must be between -180 and 180');
  }

  // Validate SVG size if provided (limit to 200kb)
  if (trackSvg && trackSvg.length > 200000) {
    res.status(400);
    throw new Error('Track SVG is too large (max 200kb)');
  }

  // Find or create season
  let season = await Season.findOne({ year: seasonYear });
  if (!season) {
    season = await Season.create({ year: seasonYear });
  }

  const race = await Race.create({
    name,
    circuit,
    date,
    season: season._id,
    latitude: latitude || null,
    longitude: longitude || null,
    circuitCountry: circuitCountry || '',
    circuitCity: circuitCity || '',
    trackSvg: trackSvg || null,
  });

  // Add race to season
  season.races.push(race._id);
  await season.save();

  const populatedRace = await Race.findById(race._id).populate('season');
  res.status(201).json(populatedRace);
});

/**
 * @desc    Submit race results
 * @route   POST /api/races/:id/results
 * @access  Private/Admin
 */
const submitRaceResults = asyncHandler(async (req, res) => {
  const { results } = req.body; // Array of { driverId, position }

  if (!results || !Array.isArray(results)) {
    res.status(400);
    throw new Error('Please provide results array');
  }

  const race = await Race.findById(req.params.id);
  if (!race) {
    res.status(404);
    throw new Error('Race not found');
  }

  // Clear existing results
  await RaceResult.deleteMany({ race: race._id });
  race.results = [];

  const raceResults = [];

  // Process each result
  for (const result of results) {
    const { driverId, position } = result;

    const driver = await Driver.findById(driverId).populate('team');
    if (!driver) {
      continue;
    }

    // Calculate points
    const points = getPointsForPosition(position);

    // Create race result
    const raceResult = await RaceResult.create({
      driver: driverId,
      race: race._id,
      position,
      pointsAwarded: points,
    });

    raceResults.push(raceResult._id);

    // Update driver stats
    driver.points += points;
    if (isPodium(position)) {
      driver.podiums += 1;
    }
    if (isWin(position)) {
      driver.wins += 1;
    }
    await driver.save();

    // Update constructor points
    const constructor = await Constructor.findById(driver.team._id);
    if (constructor) {
      constructor.points += points;
      await constructor.save();
    }
  }

  // Update race with results
  race.results = raceResults;
  await race.save();

  const populatedRace = await Race.findById(race._id).populate({
    path: 'results',
    populate: {
      path: 'driver',
      populate: 'team',
    },
  });

  res.json(populatedRace);
});

/**
 * @desc    Get single race with results
 * @route   GET /api/races/:id
 * @access  Public
 */
const getRaceById = asyncHandler(async (req, res) => {
  const race = await Race.findById(req.params.id)
    .populate('season')
    .populate({
      path: 'results',
      populate: {
        path: 'driver',
        populate: 'team',
      },
    });

  if (!race) {
    res.status(404);
    throw new Error('Race not found');
  }

  res.json(race);
});

/**
 * @desc    Update race results (Edit existing results)
 * @route   PUT /api/races/:id/results
 * @access  Private/Admin
 */
const updateRaceResults = asyncHandler(async (req, res) => {
  const { results } = req.body; // Array of { driverId, position }

  if (!results || !Array.isArray(results)) {
    res.status(400);
    throw new Error('Please provide results array');
  }

  const race = await Race.findById(req.params.id).populate({
    path: 'results',
    populate: {
      path: 'driver',
      populate: 'team',
    },
  });

  if (!race) {
    res.status(404);
    throw new Error('Race not found');
  }

  // Step 1: Reverse previous points from drivers and constructors
  for (const oldResult of race.results) {
    const driver = await Driver.findById(oldResult.driver._id).populate('team');
    if (driver) {
      // Subtract old points
      driver.points -= oldResult.pointsAwarded;
      
      // Reverse podium count
      if (isPodium(oldResult.position)) {
        driver.podiums = Math.max(0, driver.podiums - 1);
      }
      
      // Reverse win count
      if (isWin(oldResult.position)) {
        driver.wins = Math.max(0, driver.wins - 1);
      }
      
      await driver.save();

      // Reverse constructor points
      const constructor = await Constructor.findById(driver.team._id);
      if (constructor) {
        constructor.points -= oldResult.pointsAwarded;
        await constructor.save();
      }
    }
  }

  // Step 2: Delete old race results
  await RaceResult.deleteMany({ race: race._id });
  race.results = [];

  // Step 3: Create new race results with updated positions
  const newRaceResults = [];

  for (const result of results) {
    const { driverId, position } = result;

    const driver = await Driver.findById(driverId).populate('team');
    if (!driver) {
      continue;
    }

    // Calculate new points
    const points = getPointsForPosition(position);

    // Create new race result
    const raceResult = await RaceResult.create({
      driver: driverId,
      race: race._id,
      position,
      pointsAwarded: points,
    });

    newRaceResults.push(raceResult._id);

    // Update driver stats with new points
    driver.points += points;
    if (isPodium(position)) {
      driver.podiums += 1;
    }
    if (isWin(position)) {
      driver.wins += 1;
    }
    await driver.save();

    // Update constructor points
    const constructor = await Constructor.findById(driver.team._id);
    if (constructor) {
      constructor.points += points;
      await constructor.save();
    }
  }

  // Step 4: Update race with new results
  race.results = newRaceResults;
  await race.save();

  // Return populated race
  const populatedRace = await Race.findById(race._id).populate({
    path: 'results',
    populate: {
      path: 'driver',
      populate: 'team',
    },
  });

  res.json(populatedRace);
});

/**
 * @desc    Update race details
 * @route   PUT /api/races/:id
 * @access  Private/Admin
 */
const updateRace = asyncHandler(async (req, res) => {
  const { name, circuit, date, seasonYear, latitude, longitude, circuitCountry, circuitCity, trackSvg } = req.body;

  const race = await Race.findById(req.params.id).populate('season');
  
  if (!race) {
    res.status(404);
    throw new Error('Race not found');
  }

  // Validate coordinates if provided
  if (latitude !== undefined && (latitude < -90 || latitude > 90)) {
    res.status(400);
    throw new Error('Latitude must be between -90 and 90');
  }
  if (longitude !== undefined && (longitude < -180 || longitude > 180)) {
    res.status(400);
    throw new Error('Longitude must be between -180 and 180');
  }

  // Validate SVG size if provided (limit to 200kb)
  if (trackSvg && trackSvg.length > 200000) {
    res.status(400);
    throw new Error('Track SVG is too large (max 200kb)');
  }

  const oldSeasonId = race.season._id.toString();
  let newSeasonId = oldSeasonId;

  // Check if season is being changed
  if (seasonYear && seasonYear !== race.season.year) {
    // Find or create new season
    let newSeason = await Season.findOne({ year: seasonYear });
    if (!newSeason) {
      newSeason = await Season.create({ year: seasonYear });
    }
    newSeasonId = newSeason._id.toString();

    // Remove race from old season
    const oldSeason = await Season.findById(oldSeasonId);
    if (oldSeason) {
      oldSeason.races = oldSeason.races.filter(
        (raceId) => raceId.toString() !== race._id.toString()
      );
      await oldSeason.save();
    }

    // Add race to new season
    if (!newSeason.races.includes(race._id)) {
      newSeason.races.push(race._id);
      await newSeason.save();
    }

    race.season = newSeason._id;
  }

  // Check for duplicate race name in the same season
  if (name && name !== race.name) {
    const duplicateRace = await Race.findOne({
      name,
      season: newSeasonId,
      _id: { $ne: race._id },
    });

    if (duplicateRace) {
      res.status(400);
      throw new Error('A race with this name already exists in this season');
    }
  }

  // Update race fields
  race.name = name || race.name;
  race.circuit = circuit || race.circuit;
  race.date = date || race.date;
  if (latitude !== undefined) race.latitude = latitude;
  if (longitude !== undefined) race.longitude = longitude;
  if (circuitCountry !== undefined) race.circuitCountry = circuitCountry;
  if (circuitCity !== undefined) race.circuitCity = circuitCity;
  if (trackSvg !== undefined) race.trackSvg = trackSvg;

  await race.save();

  const updatedRace = await Race.findById(race._id)
    .populate('season')
    .populate({
      path: 'results',
      populate: {
        path: 'driver',
        populate: 'team',
      },
    });

  res.json(updatedRace);
});

module.exports = {
  getRaces,
  getRaceById,
  createRace,
  updateRace,
  submitRaceResults,
  updateRaceResults,
};
