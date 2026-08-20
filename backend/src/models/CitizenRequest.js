const mongoose = require('mongoose');

const citizenRequestSchema = new mongoose.Schema(
  {
    requestId: {
      type: String,
      required: true,
      unique: true,
    },
    originalText: {
      type: String,
      required: true,
    },
    language: {
      type: String,
      enum: ['en', 'hi', 'bn'],
      required: true,
    },
    translatedText: {
      type: String,
    },
    category: {
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
    subCategory: {
      type: String,
    },
    problem: {
      type: String,
    },
    location: {
      country: { type: String },
      state: { type: String },
      district: { type: String },
    },
    latitude: {
      type: Number,
    },
    longitude: {
      type: Number,
    },
    locationConfidence: {
      type: String,
      enum: ['HIGH', 'MEDIUM', 'LOW'],
    },
    urgency: {
      type: String,
      enum: ['LOW', 'MEDIUM', 'HIGH'],
    },
    confidence: {
      type: Number,
      min: 0,
      max: 100,
    },
    source: {
      type: String,
      enum: ['text', 'voice', 'messaging'],
      required: true,
    },
    affectedPopulationEstimate: {
      type: Number,
      min: 0,
      default: null,
    },
    citizenProvided: {
      category: { type: String, default: null },
      urgency: { type: String, default: null },
      state: { type: String, default: null },
      district: { type: String, default: null },
    },//step14
     aiUnderstanding: {
      language: { type: String, default: null },
      translatedText: { type: String, default: null },
      category: { type: String, default: null },
      subCategory: { type: String, default: null },
      problem: { type: String, default: null },
      location: {
        country: { type: String, default: null },
        state: { type: String, default: null },
        district: { type: String, default: null },
      },
      locationConfidence: { type: String, default: null },
      urgency: { type: String, default: null },
      confidence: { type: Number, default: null },
      analyzedAt: { type: Date, default: null },
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

citizenRequestSchema.index({ 'location.country': 1 });
citizenRequestSchema.index({ 'location.state': 1 });
citizenRequestSchema.index({ 'location.district': 1 });
citizenRequestSchema.index({ category: 1 });
citizenRequestSchema.index({ timestamp: 1 });

module.exports = mongoose.model('CitizenRequest', citizenRequestSchema);
