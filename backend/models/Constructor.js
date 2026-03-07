const mongoose = require('mongoose');

const constructorSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please add a constructor name'],
      trim: true,
      unique: true,
    },
    country: {
      type: String,
      required: [true, 'Please add country'],
      trim: true,
    },
    points: {
      type: Number,
      default: 0,
    },
    logoUrl: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Constructor', constructorSchema);
