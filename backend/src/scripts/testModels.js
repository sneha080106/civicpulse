const connectDB = require('../config/db');
const mongoose = require('mongoose');

const CitizenRequest = require('../models/CitizenRequest');
const Demographic = require('../models/Demographic');
const Infrastructure = require('../models/Infrastructure');
const Investment = require('../models/Investment');
const PriorityResult = require('../models/PriorityResult');

const runValidation = async () => {
  await connectDB();

  const results = [];

  // 1. CitizenRequest
  try {
    const doc = new CitizenRequest({
      requestId: 'REQ-TEST-001',
      originalText: 'Sample pothole complaint text',
      language: 'en',
      translatedText: 'Sample pothole complaint text',
      category: 'Roads & Transport',
      subCategory: 'Pothole',
      problem: 'Large pothole on main road',
      location: {
        country: 'India',
        state: 'Jharkhand',
        district: 'Jamshedpur',
      },
      latitude: 22.8046,
      longitude: 86.2029,
      locationConfidence: 'HIGH',
      urgency: 'MEDIUM',
      confidence: 90,
      source: 'text',
    });
    await doc.validate();
    results.push({ model: 'CitizenRequest', status: 'PASS' });
  } catch (err) {
    results.push({ model: 'CitizenRequest', status: 'FAIL', error: err.message });
  }

  // 2. Demographic
  try {
    const doc = new Demographic({
      regionId: 'REGION-TEST-001',
      country: 'India',
      stateProvince: 'Jharkhand',
      district: 'Jamshedpur',
      population: 1500000,
      populationDensity: 850,
      ruralPopulation: 400000,
      urbanPopulation: 1100000,
      vulnerablePopulationIndicator: 35,
    });
    await doc.validate();
    results.push({ model: 'Demographic', status: 'PASS' });
  } catch (err) {
    results.push({ model: 'Demographic', status: 'FAIL', error: err.message });
  }

  // 3. Infrastructure
  try {
    const doc = new Infrastructure({
      regionId: 'REGION-TEST-001',
      roadConnectivityIndex: 60,
      healthcareAccessIndex: 55,
      educationAccessIndex: 70,
      waterAccessIndex: 65,
      electricityAccessIndex: 80,
      internetAccessIndex: 50,
      dataYear: 2025,
      dataSource: 'Sample Government Dataset',
    });
    await doc.validate();
    results.push({ model: 'Infrastructure', status: 'PASS' });
  } catch (err) {
    results.push({ model: 'Infrastructure', status: 'FAIL', error: err.message });
  }

  // 4. Investment
  try {
    const doc = new Investment({
      regionId: 'REGION-TEST-001',
      sector: 'Roads & Transport',
      existingInvestment: 500000,
      plannedInvestment: 200000,
      projectCount: 3,
      projectStatus: 'Ongoing',
      financialYear: '2025-2026',
    });
    await doc.validate();
    results.push({ model: 'Investment', status: 'PASS' });
  } catch (err) {
    results.push({ model: 'Investment', status: 'FAIL', error: err.message });
  }

  // 5. PriorityResult
  try {
    const doc = new PriorityResult({
      priorityId: 'PRIORITY-TEST-001',
      regionId: 'REGION-TEST-001',
      district: 'Jamshedpur',
      sector: 'Roads & Transport',
      priorityScore: 82,
      demandScore: 75,
      infrastructureGap: 40,
      populationImpact: 60,
      urgencyScore: 70,
      investmentGap: 55,
      citizenRequestCount: 12,
      affectedPopulation: 50000,
      evidence: 'Multiple citizen reports of road damage',
      recommendation: 'Prioritize road repair funding',
    });
    await doc.validate();
    results.push({ model: 'PriorityResult', status: 'PASS' });
  } catch (err) {
    results.push({ model: 'PriorityResult', status: 'FAIL', error: err.message });
  }

  console.log('\n--- CivicPulse Model Validation Results ---');
  results.forEach((r) => {
    if (r.status === 'PASS') {
      console.log(`✅ ${r.model}: PASS`);
    } else {
      console.log(`❌ ${r.model}: FAIL — ${r.error}`);
    }
  });
  console.log('--------------------------------------------\n');

  await mongoose.connection.close();
  process.exit(0);
};

runValidation().catch((err) => {
  console.error('Validation script crashed:', err);
  process.exit(1);
});