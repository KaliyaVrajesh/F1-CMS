const asyncHandler = require('express-async-handler');
const Driver = require('../models/Driver');
const Constructor = require('../models/Constructor');

/**
 * @desc    Get all drivers
 * @route   GET /api/drivers
 * @access  Public
 */
const getDrivers = asyncHandler(async (req, res) => {
  const drivers = await Driver.find().populate('team', 'name country').sort({ points: -1 });
  res.json(drivers);
});

/**
 * @desc    Get single driver
 * @route   GET /api/drivers/:id
 * @access  Public
 */
const getDriverById = asyncHandler(async (req, res) => {
  const driver = await Driver.findById(req.params.id).populate('team', 'name country');

  if (driver) {
    res.json(driver);
  } else {
    res.status(404);
    throw new Error('Driver not found');
  }
});

/**
 * @desc    Create new driver
 * @route   POST /api/drivers
 * @access  Private/Admin
 */
const createDriver = asyncHandler(async (req, res) => {
  const { name, nationality, team, number } = req.body;

  if (!name || !nationality || !team || !number) {
    res.status(400);
    throw new Error('Please add all fields');
  }

  // Check if team exists
  const teamExists = await Constructor.findById(team);
  if (!teamExists) {
    res.status(404);
    throw new Error('Team not found');
  }

  const driver = await Driver.create({
    name,
    nationality,
    team,
    number,
  });

  const populatedDriver = await Driver.findById(driver._id).populate('team', 'name country');
  res.status(201).json(populatedDriver);
});

/**
 * @desc    Update driver
 * @route   PUT /api/drivers/:id
 * @access  Private/Admin
 */
const updateDriver = asyncHandler(async (req, res) => {
  const driver = await Driver.findById(req.params.id);

  if (!driver) {
    res.status(404);
    throw new Error('Driver not found');
  }

  const updatedDriver = await Driver.findByIdAndUpdate(
    req.params.id,
    req.body,
    { new: true, runValidators: true }
  ).populate('team', 'name country');

  res.json(updatedDriver);
});

/**
 * @desc    Delete driver
 * @route   DELETE /api/drivers/:id
 * @access  Private/Admin
 */
const deleteDriver = asyncHandler(async (req, res) => {
  const driver = await Driver.findById(req.params.id);

  if (!driver) {
    res.status(404);
    throw new Error('Driver not found');
  }

  await driver.deleteOne();
  res.json({ message: 'Driver removed' });
});

module.exports = {
  getDrivers,
  getDriverById,
  createDriver,
  updateDriver,
  deleteDriver,
};
