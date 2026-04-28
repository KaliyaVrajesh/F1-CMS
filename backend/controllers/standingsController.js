const asyncHandler = require('express-async-handler');
const Driver = require('../models/Driver');
const Constructor = require('../models/Constructor');
const Season = require('../models/Season');
const RaceResult = require('../models/RaceResult');
const Race = require('../models/Race');

/**
 * @desc    Get driver standings for a season
 * @route   GET /api/standings/drivers/:seasonYear
 * @access  Public
 */
const getDriverStandings = asyncHandler(async (req, res) => {
  const { seasonYear } = req.params;
  const year = parseInt(seasonYear, 10);

  const season = await Season.findOne({ year });
  if (!season) {
    return res.json([]);
  }

  // Get all races in this season
  const races = await Race.find({ season: season._id });
  const raceIds = races.map((r) => r._id);

  // Aggregate points per driver for this season
  const results = await RaceResult.find({ race: { $in: raceIds } }).populate({
    path: 'driver',
    populate: { path: 'team', select: 'name country' },
  });

  const driverMap = {};
  for (const result of results) {
    if (!result.driver) continue;
    const id = result.driver._id.toString();
    if (!driverMap[id]) {
      driverMap[id] = {
        _id: result.driver._id,
        name: result.driver.name,
        nationality: result.driver.nationality,
        number: result.driver.number,
        imageUrl: result.driver.imageUrl,
        team: result.driver.team,
        points: 0,
        wins: 0,
        podiums: 0,
      };
    }
    driverMap[id].points += result.pointsAwarded;
    if (result.position === 1) driverMap[id].wins += 1;
    if (result.position <= 3) driverMap[id].podiums += 1;
  }

  const standings = Object.values(driverMap).sort(
    (a, b) => b.points - a.points || b.wins - a.wins || b.podiums - a.podiums
  );

  res.json(standings);
});

/**
 * @desc    Get constructor standings for a season
 * @route   GET /api/standings/constructors/:seasonYear
 * @access  Public
 */
const getConstructorStandings = asyncHandler(async (req, res) => {
  const { seasonYear } = req.params;
  const year = parseInt(seasonYear, 10);

  const season = await Season.findOne({ year });
  if (!season) {
    return res.json([]);
  }

  // Get all races in this season
  const races = await Race.find({ season: season._id });
  const raceIds = races.map((r) => r._id);

  // Aggregate points per constructor for this season
  const results = await RaceResult.find({ race: { $in: raceIds } }).populate({
    path: 'driver',
    populate: { path: 'team', select: 'name country logoUrl' },
  });

  const constructorMap = {};
  for (const result of results) {
    if (!result.driver?.team) continue;
    const team = result.driver.team;
    const id = team._id.toString();
    if (!constructorMap[id]) {
      constructorMap[id] = {
        _id: team._id,
        name: team.name,
        country: team.country,
        logoUrl: team.logoUrl,
        points: 0,
      };
    }
    constructorMap[id].points += result.pointsAwarded;
  }

  const standings = Object.values(constructorMap).sort((a, b) => b.points - a.points);

  res.json(standings);
});

module.exports = {
  getDriverStandings,
  getConstructorStandings,
};
