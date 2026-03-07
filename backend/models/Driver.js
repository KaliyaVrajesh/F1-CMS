const mongoose = require('mongoose');

const driverSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please add a driver name'],
      trim: true,
    },
    nationality: {
      type: String,
      required: [true, 'Please add nationality'],
      trim: true,
    },
    team: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Constructor',
      required: [true, 'Please assign a team'],
    },
    number: {
      type: Number,
      required: [true, 'Please add driver number'],
      min: 1,
      max: 99,
    },
    points: {
      type: Number,
      default: 0,
    },
    podiums: {
      type: Number,
      default: 0,
    },
    wins: {
      type: Number,
      default: 0,
    },
    imageUrl: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Driver', driverSchema);
