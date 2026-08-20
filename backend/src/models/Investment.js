const mongoose = require('mongoose');

const investmentSchema = new mongoose.Schema(
  {
    regionId: {
      type: String,
      required: true,
    },
    sector: {
      type: String,
      enum: [
        'Roads & Transport',
        'Healthcare',
        'Education',
        'Water & Sanitation',
        'Electricity',
        'Internet & Digital Connectivity',
        'Housing',
        'Public Safety',
        'Other',
      ],
      required: true,
    },
    existingInvestment: {
      type: Number,
      min: 0,
    },
    plannedInvestment: {
      type: Number,
      min: 0,
    },
    projectCount: {
      type: Number,
      min: 0,
    },
    projectStatus: {
      type: String,
      enum: ['Planned', 'Ongoing', 'Completed'],
    },
    financialYear: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

investmentSchema.index({ regionId: 1, sector: 1, financialYear: 1 });

module.exports = mongoose.model('Investment', investmentSchema);