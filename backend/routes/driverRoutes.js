const express = require('express');
const router = express.Router();
const {
  getDrivers,
  getDriverById,
  createDriver,
  updateDriver,
  deleteDriver,
} = require('../controllers/driverController');
const { protect, admin } = require('../middleware/authMiddleware');

router.route('/').get(getDrivers).post(protect, admin, createDriver);
router
  .route('/:id')
  .get(getDriverById)
  .put(protect, admin, updateDriver)
  .delete(protect, admin, deleteDriver);

module.exports = router;
