const asyncHandler = require('express-async-handler');
const Legend = require('../models/Legend');

/**
 * @desc  Get all legend image overrides
 * @route GET /api/legends
 * @access Public
 */
const getLegends = asyncHandler(async (req, res) => {
  const legends = await Legend.find({});
  res.json(legends);
});

/**
 * @desc  Upsert image URLs for a legend
 * @route PUT /api/legends/:legendId
 * @access Private/Admin
 */
const updateLegendImages = asyncHandler(async (req, res) => {
  const { legendId } = req.params;
  const { image, image2 } = req.body;

  const legend = await Legend.findOneAndUpdate(
    { legendId },
    { image, image2 },
    { new: true, upsert: true, runValidators: true }
  );

  res.json(legend);
});

module.exports = { getLegends, updateLegendImages };
