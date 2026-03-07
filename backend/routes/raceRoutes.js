const express = require('express');
const router = express.Router();
const {
  getRaces,
  getRaceById,
  createRace,
  updateRace,
  submitRaceResults,
  updateRaceResults,
} = require('../controllers/raceController');
const { protect, admin } = require('../middleware/authMiddleware');

router.route('/').get(getRaces).post(protect, admin, createRace);
router.route('/:id')
  .get(getRaceById)
  .put(protect, admin, updateRace);
router.route('/:id/results')
  .post(protect, admin, submitRaceResults)
  .put(protect, admin, updateRaceResults);

module.exports = router;
