const mongoose = require('mongoose');

const priorityResultSchema = new mongoose.Schema(
  {
    priorityId: { type: String, required: true, unique: true },
    regionId: { type: String, required: true },
    district: { type: String },
    sector: {
      type: String,
      enum: [
        'Roads & Transport', 'Healthcare', 'Education', 'Water & Sanitation',
        'Electricity', 'Internet & Digital Connectivity', 'Housing', 'Public Safety', 'Other',
      ],
    },

    priorityScore: { type: Number, min: 0, max: 100 },

    demandScore: { type: Number, min: 0, max: 100 },
    infrastructureIndex: { type: Number, min: 0, max: 100, default: null },
    infrastructureGap: { type: Number, min: 0, max: 100 },

    populationImpact: { type: Number, min: 0, max: 100 },
    affectedPopulation: { type: Number, min: 0 },

    urgencyScore: { type: Number, min: 0, max: 100 },
    investmentGap: { type: Number, min: 0, max: 100 },

    citizenRequestCount: { type: Number, min: 0 },

    evidence: {
      demandRate: { type: Number, default: null },
      totalInvestment: { type: Number, default: null },
      investmentCoverageProxy: { type: Number, default: null },
    },

    scoreBreakdown: {
      demandContribution: { type: Number, default: 0 },
      infrastructureContribution: { type: Number, default: 0 },
      populationContribution: { type: Number, default: 0 },
      urgencyContribution: { type: Number, default: 0 },
      investmentContribution: { type: Number, default: 0 },
    },

    recommendation: { type: String, default: null },
    recommendationDrivers: [{ type: String }],
    warnings: [{ type: String }],
  
    calculatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

priorityResultSchema.index({ priorityScore: 1 });
priorityResultSchema.index({ regionId: 1 });
priorityResultSchema.index({ sector: 1 });

module.exports = mongoose.model('PriorityResult', priorityResultSchema);