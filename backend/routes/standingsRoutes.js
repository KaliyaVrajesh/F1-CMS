const express = require('express');
const router = express.Router();
const {
  getDriverStandings,
  getConstructorStandings,
} = require('../controllers/standingsController');

router.get('/drivers/:seasonYear', getDriverStandings);
router.get('/constructors/:seasonYear', getConstructorStandings);

module.exports = router;
