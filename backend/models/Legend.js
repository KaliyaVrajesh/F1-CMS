const mongoose = require('mongoose');

const legendSchema = new mongoose.Schema(
  {
    legendId: { type: String, required: true, unique: true }, // e.g. 'senna'
    image:    { type: String, default: '' },
    image2:   { type: String, default: '' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Legend', legendSchema);
