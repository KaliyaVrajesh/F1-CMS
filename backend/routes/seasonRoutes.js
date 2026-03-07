const express = require('express');
const router = express.Router();
const {
  getSeasons,
  getSeasonByYear,
  createSeason,
} = require('../controllers/seasonController');
const { protect, admin } = require('../middleware/authMiddleware');

router.route('/').get(getSeasons).post(protect, admin, createSeason);
router.route('/:year').get(getSeasonByYear);

module.exports = router;
