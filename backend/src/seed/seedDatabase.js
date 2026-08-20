require('../config/env'); // load & validate environment variables
const mongoose = require('mongoose');
const connectDB = require('../config/db');

const CitizenRequest = require('../models/CitizenRequest');
const Demographic = require('../models/Demographic');
const Infrastructure = require('../models/Infrastructure');
const Investment = require('../models/Investment');

const demographics = require('./demographics');
const infrastructure = require('./infrastructure');
const investments = require('./investments');
const citizenRequests = require('./citizenRequests');

const VALID_SECTORS = [
  'Roads & Transport',
  'Healthcare',
  'Education',
  'Water & Sanitation',
  'Electricity',
  'Internet & Digital Connectivity',
  'Housing',
  'Public Safety',
  'Other',
];

// Validates all seed data BEFORE touching the database.
// Throws with a clear message on the first problem found.
const validateSeedData = () => {
  const errors = [];

  const regionIds = new Set(demographics.map((d) => d.regionId));
  const districts = new Set(demographics.map((d) => d.district));
  const infraRegionIds = new Set(infrastructure.map((i) => i.regionId));

  // Every demographic region must have matching infrastructure data
  demographics.forEach((d) => {
    if (!infraRegionIds.has(d.regionId)) {
      errors.push(`Missing infrastructure record for regionId "${d.regionId}"`);
    }
  });

  // Infrastructure indexes must be 0-100
  infrastructure.forEach((i) => {
    ['roadConnectivityIndex', 'healthcareAccessIndex', 'educationAccessIndex', 'waterAccessIndex', 'electricityAccessIndex', 'internetAccessIndex'].forEach((field) => {
      const value = i[field];
      if (typeof value !== 'number' || value < 0 || value > 100) {
        errors.push(`Infrastructure "${i.regionId}" field "${field}" is out of range 0-100 (value: ${value})`);
      }
    });
    if (!regionIds.has(i.regionId)) {
      errors.push(`Infrastructure regionId "${i.regionId}" has no matching demographic record`);
    }
  });

  // Investment: regionId must exist, sector must be valid, values non-negative
  investments.forEach((inv) => {
    if (!regionIds.has(inv.regionId)) {
      errors.push(`Investment regionId "${inv.regionId}" has no matching demographic record`);
    }
    if (!VALID_SECTORS.includes(inv.sector)) {
      errors.push(`Investment sector "${inv.sector}" is not a valid sector`);
    }
    if (inv.existingInvestment < 0 || inv.plannedInvestment < 0) {
      errors.push(`Investment "${inv.regionId}/${inv.sector}" has a negative investment value`);
    }
  });

  // Citizen requests: unique requestId, valid district reference, valid category
  const seenRequestIds = new Set();
  citizenRequests.forEach((req) => {
    if (seenRequestIds.has(req.requestId)) {
      errors.push(`Duplicate requestId found: "${req.requestId}"`);
    }
    seenRequestIds.add(req.requestId);

    if (!districts.has(req.location.district)) {
      errors.push(`Citizen request "${req.requestId}" references unknown district "${req.location.district}"`);
    }
    if (!VALID_SECTORS.includes(req.category)) {
      errors.push(`Citizen request "${req.requestId}" has invalid category "${req.category}"`);
    }
    if (!['en', 'hi', 'bn'].includes(req.language)) {
      errors.push(`Citizen request "${req.requestId}" has invalid language "${req.language}"`);
    }
    if (!['LOW', 'MEDIUM', 'HIGH'].includes(req.urgency)) {
      errors.push(`Citizen request "${req.requestId}" has invalid urgency "${req.urgency}"`);
    }
    if (!['text', 'voice', 'messaging'].includes(req.source)) {
      errors.push(`Citizen request "${req.requestId}" has invalid source "${req.source}"`);
    }
  });

  if (errors.length > 0) {
    throw new Error(`Seed data validation failed with ${errors.length} error(s):\n- ${errors.join('\n- ')}`);
  }
};

const seedDatabase = async () => {
  console.log('=== CivicPulse Seed ===\n');

  validateSeedData();
  console.log('Seed data validated successfully.\n');

  await connectDB();

  // Clear ONLY the four seed-owned collections. priorityResults is left untouched.
  await Promise.all([
    CitizenRequest.deleteMany({}),
    Demographic.deleteMany({}),
    Infrastructure.deleteMany({}),
    Investment.deleteMany({}),
  ]);

  const insertedDemographics = await Demographic.insertMany(demographics);
  const insertedInfrastructure = await Infrastructure.insertMany(infrastructure);
  const insertedInvestments = await Investment.insertMany(investments);
  const insertedCitizenRequests = await CitizenRequest.insertMany(citizenRequests);

  console.log(`Citizen Requests: ${insertedCitizenRequests.length}`);
  console.log(`Demographics: ${insertedDemographics.length}`);
  console.log(`Infrastructure: ${insertedInfrastructure.length}`);
  console.log(`Investments: ${insertedInvestments.length}`);
  console.log('\nSeed completed successfully.\n');

  await mongoose.connection.close();
  process.exit(0);
};

seedDatabase().catch((err) => {
  console.error('\nSeed failed:', err.message);
  process.exit(1);
});