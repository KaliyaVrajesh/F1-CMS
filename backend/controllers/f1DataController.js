/**
 * F1 Live Data Controller
 * Exposes all external API data through the backend proxy
 * to avoid CORS issues and centralise caching.
 */
const asyncHandler = require('express-async-handler');
const f1 = require('../services/f1DataService');

// ── Schedule ──────────────────────────────────────────────────────────────────

const getSchedule = asyncHandler(async (req, res) => {
  const year = parseInt(req.query.year, 10) || undefined;
  const data = await f1.getSchedule(year);
  res.json(data);
});

// ── Circuits ──────────────────────────────────────────────────────────────────

const getCircuits = asyncHandler(async (req, res) => {
  const year = parseInt(req.params.year || req.query.year, 10) || null;
  const data = await f1.getCircuits(year);
  res.json(data);
});

const getCurrentSeasonCircuits = asyncHandler(async (req, res) => {
  const year = parseInt(req.params.year || req.query.year, 10) || undefined;
  const data = await f1.getCurrentSeasonCircuits(year);
  res.json(data);
});

// ── Standings ─────────────────────────────────────────────────────────────────

const getDriverStandings = asyncHandler(async (req, res) => {
  const year = parseInt(req.params.year || req.query.year, 10) || undefined;
  const data = await f1.getDriverStandings(year);
  res.json(data);
});

const getConstructorStandings = asyncHandler(async (req, res) => {
  const year = parseInt(req.params.year || req.query.year, 10) || undefined;
  const data = await f1.getConstructorStandings(year);
  res.json(data);
});

// ── Race results ──────────────────────────────────────────────────────────────

const getRaceResults = asyncHandler(async (req, res) => {
  const year  = parseInt(req.params.year,  10) || undefined;
  const round = parseInt(req.params.round, 10);
  if (!round) { res.status(400); throw new Error('round param required'); }
  const data = await f1.getRaceResults(year, round);
  if (!data) { res.status(404); throw new Error('Race not found'); }
  res.json(data);
});

const getQualifyingResults = asyncHandler(async (req, res) => {
  const year  = parseInt(req.params.year,  10) || undefined;
  const round = parseInt(req.params.round, 10);
  if (!round) { res.status(400); throw new Error('round param required'); }
  const data = await f1.getQualifyingResults(year, round);
  if (!data) { res.status(404); throw new Error('Qualifying not found'); }
  res.json(data);
});

const getLastRaceResults = asyncHandler(async (req, res) => {
  const data = await f1.getLastRaceResults();
  if (!data) { res.status(404); throw new Error('No completed race found'); }
  res.json(data);
});

const getNextRace = asyncHandler(async (req, res) => {
  const data = await f1.getNextRace();
  if (!data) { res.status(404); throw new Error('No upcoming race found'); }
  res.json(data);
});

// ── Lap data ──────────────────────────────────────────────────────────────────

const getLapTimes = asyncHandler(async (req, res) => {
  const year  = parseInt(req.params.year,  10) || undefined;
  const round = parseInt(req.params.round, 10);
  const lap   = req.params.lap || 'all';
  if (!round) { res.status(400); throw new Error('round param required'); }
  const data = await f1.getLapTimes(year, round, lap);
  res.json(data);
});

const getPitStops = asyncHandler(async (req, res) => {
  const year  = parseInt(req.params.year,  10) || undefined;
  const round = parseInt(req.params.round, 10);
  if (!round) { res.status(400); throw new Error('round param required'); }
  const data = await f1.getPitStops(year, round);
  res.json(data);
});

// ── Driver info ───────────────────────────────────────────────────────────────

const getDriverCareerStats = asyncHandler(async (req, res) => {
  const { driverId } = req.params;
  if (!driverId) { res.status(400); throw new Error('driverId required'); }
  const data = await f1.getDriverCareerStats(driverId);
  res.json(data);
});

// ── Season list ───────────────────────────────────────────────────────────────

const getAllSeasons = asyncHandler(async (req, res) => {
  const data = await f1.getAllSeasons();
  res.json(data);
});

// ── OpenF1 live data ──────────────────────────────────────────────────────────

const getLatestSession = asyncHandler(async (req, res) => {
  const data = await f1.getLatestSession();
  res.json(data || {});
});

const getLivePositions = asyncHandler(async (req, res) => {
  const sessionKey = req.query.session_key || 'latest';
  const data = await f1.getLivePositions(sessionKey);
  res.json(data);
});

const getLiveIntervals = asyncHandler(async (req, res) => {
  const sessionKey = req.query.session_key || 'latest';
  const data = await f1.getLiveIntervals(sessionKey);
  res.json(data);
});

const getLivePitStops = asyncHandler(async (req, res) => {
  const sessionKey = req.query.session_key || 'latest';
  const data = await f1.getLivePitStops(sessionKey);
  res.json(data);
});

const getSessionWeather = asyncHandler(async (req, res) => {
  const sessionKey = req.query.session_key || 'latest';
  const data = await f1.getSessionWeather(sessionKey);
  res.json(data || {});
});

const getStints = asyncHandler(async (req, res) => {
  const sessionKey = req.query.session_key || 'latest';
  const data = await f1.getStints(sessionKey);
  res.json(data);
});

const getTeamRadio = asyncHandler(async (req, res) => {
  const sessionKey = req.query.session_key || 'latest';
  const data = await f1.getTeamRadio(sessionKey);
  res.json(data);
});

const getCurrentTyres = asyncHandler(async (req, res) => {
  const sessionKey = req.query.session_key || 'latest';
  const data = await f1.getCurrentTyres(sessionKey);
  res.json(data);
});

const getSessions = asyncHandler(async (req, res) => {
  const year        = parseInt(req.query.year, 10) || undefined;
  const grandPrix   = req.query.gp || null;
  const data = await f1.getSessions(year, grandPrix);
  res.json(data);
});

const getOpenF1Drivers = asyncHandler(async (req, res) => {
  const sessionKey = req.query.session_key || 'latest';
  const data = await f1.getOpenF1Drivers(sessionKey);
  res.json(data);
});

// ── Compound dashboard ────────────────────────────────────────────────────────

const getDashboardSnapshot = asyncHandler(async (req, res) => {
  const data = await f1.getDashboardSnapshot();
  res.json(data);
});

// ── Cache management (admin only) ─────────────────────────────────────────────

const getCacheStats = asyncHandler(async (req, res) => {
  res.json(f1.getCacheStats());
});

const clearCache = asyncHandler(async (req, res) => {
  const tier = req.query.tier || 'all';
  f1.clearCache(tier);
  res.json({ message: `Cache cleared: ${tier}` });
});

module.exports = {
  getSchedule,
  getCircuits,
  getCurrentSeasonCircuits,
  getDriverStandings,
  getConstructorStandings,
  getRaceResults,
  getQualifyingResults,
  getLastRaceResults,
  getNextRace,
  getLapTimes,
  getPitStops,
  getDriverCareerStats,
  getAllSeasons,
  getLatestSession,
  getLivePositions,
  getLiveIntervals,
  getLivePitStops,
  getSessionWeather,
  getStints,
  getTeamRadio,
  getCurrentTyres,
  getSessions,
  getOpenF1Drivers,
  getDashboardSnapshot,
  getCacheStats,
  clearCache,
};
