const mongoose = require('mongoose');

const raceResultSchema = new mongoose.Schema(
  {
    driver: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Driver',
      required: true,
    },
    race: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Race',
      required: true,
    },
    position: {
      type: Number,
      required: [true, 'Please add position'],
      min: 1,
    },
    pointsAwarded: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('RaceResult', raceResultSchema);
