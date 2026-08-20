const mongoose = require('mongoose');

const demographicSchema = new mongoose.Schema(
  {
    regionId: {
      type: String,
      required: true,
      unique: true,
    },
    country: {
      type: String,
      required: true,
    },
    stateProvince: {
      type: String,
      required: true,
    },
    district: {
      type: String,
      required: true,
    },
    population: {
      type: Number,
      min: 0,
    },
    populationDensity: {
      type: Number,
      min: 0,
    },
    ruralPopulation: {
      type: Number,
      min: 0,
    },
    urbanPopulation: {
      type: Number,
      min: 0,
    },
    vulnerablePopulationIndicator: {
      type: Number,
      min: 0,
      max: 100,
    },
  },
  { timestamps: true }
);

demographicSchema.index({ regionId: 1 });

module.exports = mongoose.model('Demographic', demographicSchema);