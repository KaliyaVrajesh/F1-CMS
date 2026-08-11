const express = require('express');
const router  = express.Router();
const { protect, admin } = require('../middleware/authMiddleware');
const ctrl = require('../controllers/f1DataController');

// ── Schedule ──────────────────────────────────────────────────────────────────
// GET /api/f1/schedule?year=2026
router.get('/schedule', ctrl.getSchedule);

// ── Circuits ──────────────────────────────────────────────────────────────────
// GET /api/f1/circuits              — all historical circuits
// GET /api/f1/circuits?year=2026    — circuits for a specific season
// GET /api/f1/circuits/:year        — circuits for a season (path param)
// GET /api/f1/circuits/season       — current season with round/date info
// GET /api/f1/circuits/season/:year — specific season with round/date info
router.get('/circuits/season',       ctrl.getCurrentSeasonCircuits);
router.get('/circuits/season/:year', ctrl.getCurrentSeasonCircuits);
router.get('/circuits/:year',        ctrl.getCircuits);
router.get('/circuits',              ctrl.getCircuits);

// ── Season list ───────────────────────────────────────────────────────────────
// GET /api/f1/seasons
router.get('/seasons', ctrl.getAllSeasons);

// ── Championship Standings ────────────────────────────────────────────────────
// GET /api/f1/standings/drivers?year=2025
// GET /api/f1/standings/drivers/:year
router.get('/standings/drivers',       ctrl.getDriverStandings);
router.get('/standings/drivers/:year', ctrl.getDriverStandings);

// GET /api/f1/standings/constructors?year=2025
// GET /api/f1/standings/constructors/:year
router.get('/standings/constructors',       ctrl.getConstructorStandings);
router.get('/standings/constructors/:year', ctrl.getConstructorStandings);

// ── Race Results ──────────────────────────────────────────────────────────────
// GET /api/f1/results/last
router.get('/results/last', ctrl.getLastRaceResults);

// GET /api/f1/results/:year/:round
router.get('/results/:year/:round', ctrl.getRaceResults);

// GET /api/f1/qualifying/:year/:round
router.get('/qualifying/:year/:round', ctrl.getQualifyingResults);

// ── Lap / Pit data ────────────────────────────────────────────────────────────
// GET /api/f1/laps/:year/:round
// GET /api/f1/laps/:year/:round/:lap
router.get('/laps/:year/:round',      ctrl.getLapTimes);
router.get('/laps/:year/:round/:lap', ctrl.getLapTimes);

// GET /api/f1/pitstops/:year/:round
router.get('/pitstops/:year/:round', ctrl.getPitStops);

// ── Next race ─────────────────────────────────────────────────────────────────
// GET /api/f1/next-race
router.get('/next-race', ctrl.getNextRace);

// ── Driver career stats ───────────────────────────────────────────────────────
// GET /api/f1/driver/:driverId/career
router.get('/driver/:driverId/career', ctrl.getDriverCareerStats);

// ── OpenF1 Live ───────────────────────────────────────────────────────────────
// GET /api/f1/live/session
router.get('/live/session', ctrl.getLatestSession);

// GET /api/f1/live/sessions?year=2025&gp=Monaco
router.get('/live/sessions', ctrl.getSessions);

// GET /api/f1/live/positions?session_key=latest
router.get('/live/positions', ctrl.getLivePositions);

// GET /api/f1/live/intervals?session_key=latest
router.get('/live/intervals', ctrl.getLiveIntervals);

// GET /api/f1/live/pitstops?session_key=latest
router.get('/live/pitstops', ctrl.getLivePitStops);

// GET /api/f1/live/weather?session_key=latest
router.get('/live/weather', ctrl.getSessionWeather);

// GET /api/f1/live/stints?session_key=latest
router.get('/live/stints', ctrl.getStints);

// GET /api/f1/live/radio?session_key=latest
router.get('/live/radio', ctrl.getTeamRadio);

// GET /api/f1/live/tyres?session_key=latest
router.get('/live/tyres', ctrl.getCurrentTyres);

// GET /api/f1/live/drivers?session_key=latest
router.get('/live/drivers', ctrl.getOpenF1Drivers);

// ── Compound dashboard snapshot ───────────────────────────────────────────────
// GET /api/f1/dashboard
router.get('/dashboard', ctrl.getDashboardSnapshot);

// ── Cache management (admin only) ─────────────────────────────────────────────
// GET  /api/f1/cache/stats
// POST /api/f1/cache/clear?tier=all|short|live|micro
router.get('/cache/stats',   protect, admin, ctrl.getCacheStats);
router.post('/cache/clear',  protect, admin, ctrl.clearCache);

module.exports = router;
