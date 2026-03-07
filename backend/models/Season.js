const mongoose = require('mongoose');

const seasonSchema = new mongoose.Schema(
  {
    year: {
      type: Number,
      required: [true, 'Please add a year'],
      unique: true,
    },
    races: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Race',
      },
    ],
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('Season', seasonSchema);
