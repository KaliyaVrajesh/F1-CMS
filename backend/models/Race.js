const mongoose = require('mongoose');

const raceSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please add a race name'],
      trim: true,
    },
    circuit: {
      type: String,
      required: [true, 'Please add circuit name'],
      trim: true,
    },
    date: {
      type: Date,
      required: [true, 'Please add race date'],
    },
    season: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Season',
      required: true,
    },
    latitude: {
      type: Number,
      default: null,
    },
    longitude: {
      type: Number,
      default: null,
    },
    circuitCountry: {
      type: String,
      trim: true,
      default: '',
    },
    circuitCity: {
      type: String,
      trim: true,
      default: '',
    },
    trackSvg: {
      type: String,
      default: null,
    },
    results: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'RaceResult',
      },
    ],
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Race', raceSchema);
