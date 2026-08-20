const mongoose = require('mongoose');

const infrastructureSchema = new mongoose.Schema(
  {
    regionId: {
      type: String,
      required: true,
    },
    roadConnectivityIndex: {
      type: Number,
      min: 0,
      max: 100,
    },
    healthcareAccessIndex: {
      type: Number,
      min: 0,
      max: 100,
    },
    educationAccessIndex: {
      type: Number,
      min: 0,
      max: 100,
    },
    waterAccessIndex: {
      type: Number,
      min: 0,
      max: 100,
    },
    electricityAccessIndex: {
      type: Number,
      min: 0,
      max: 100,
    },
    internetAccessIndex: {
      type: Number,
      min: 0,
      max: 100,
    },
    dataYear: {
      type: Number,
    },
    dataSource: {
      type: String,
    },
  },
  { timestamps: true }
);

infrastructureSchema.index({ regionId: 1 });

module.exports = mongoose.model('Infrastructure', infrastructureSchema);