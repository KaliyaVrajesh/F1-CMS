const asyncHandler = require('express-async-handler');
const Constructor = require('../models/Constructor');

/**
 * @desc    Get all constructors
 * @route   GET /api/constructors
 * @access  Public
 */
const getConstructors = asyncHandler(async (req, res) => {
  const constructors = await Constructor.find().sort({ points: -1 });
  res.json(constructors);
});

/**
 * @desc    Get single constructor
 * @route   GET /api/constructors/:id
 * @access  Public
 */
const getConstructorById = asyncHandler(async (req, res) => {
  const constructor = await Constructor.findById(req.params.id);

  if (constructor) {
    res.json(constructor);
  } else {
    res.status(404);
    throw new Error('Constructor not found');
  }
});

/**
 * @desc    Create new constructor
 * @route   POST /api/constructors
 * @access  Private/Admin
 */
const createConstructor = asyncHandler(async (req, res) => {
  const { name, country } = req.body;

  if (!name || !country) {
    res.status(400);
    throw new Error('Please add all fields');
  }

  const constructor = await Constructor.create({
    name,
    country,
  });

  res.status(201).json(constructor);
});

/**
 * @desc    Update constructor
 * @route   PUT /api/constructors/:id
 * @access  Private/Admin
 */
const updateConstructor = asyncHandler(async (req, res) => {
  const constructor = await Constructor.findById(req.params.id);

  if (!constructor) {
    res.status(404);
    throw new Error('Constructor not found');
  }

  const updatedConstructor = await Constructor.findByIdAndUpdate(
    req.params.id,
    req.body,
    { new: true, runValidators: true }
  );

  res.json(updatedConstructor);
});

/**
 * @desc    Delete constructor
 * @route   DELETE /api/constructors/:id
 * @access  Private/Admin
 */
const deleteConstructor = asyncHandler(async (req, res) => {
  const constructor = await Constructor.findById(req.params.id);

  if (!constructor) {
    res.status(404);
    throw new Error('Constructor not found');
  }

  await constructor.deleteOne();
  res.json({ message: 'Constructor removed' });
});

module.exports = {
  getConstructors,
  getConstructorById,
  createConstructor,
  updateConstructor,
  deleteConstructor,
};
