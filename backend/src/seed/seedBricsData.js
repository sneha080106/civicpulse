require('../config/env');
const mongoose = require('mongoose');
const connectDB = require('../config/db');
require('../models'); // registers all schemas

const { demographics, infrastructure, investments } = require('./bricsCountries.seed');

/**
 * IMPORTANT: this script is purely ADDITIVE. It never calls deleteMany() on
 * anything. Every write is an upsert keyed on that record's natural
 * identity, so running this script multiple times is safe and will not
 * create duplicates or touch existing India data in any way.
 */
const seedBricsData = async () => {
  console.log('=== CivicPulse BRICS Data Seed (additive, idempotent) ===\n');

  await connectDB();

  const Demographic = mongoose.model('Demographic');
  const Infrastructure = mongoose.model('Infrastructure');
  const Investment = mongoose.model('Investment');

  let demoCount = 0;
  for (const d of demographics) {
    await Demographic.findOneAndUpdate({ regionId: d.regionId }, d, { upsert: true });
    demoCount++;
  }

  let infraCount = 0;
  for (const i of infrastructure) {
    await Infrastructure.findOneAndUpdate({ regionId: i.regionId }, i, { upsert: true });
    infraCount++;
  }

  let investCount = 0;
  for (const inv of investments) {
    await Investment.findOneAndUpdate(
      { regionId: inv.regionId, sector: inv.sector, financialYear: inv.financialYear },
      inv,
      { upsert: true }
    );
    investCount++;
  }

  console.log(`Demographics upserted: ${demoCount}`);
  console.log(`Infrastructure upserted: ${infraCount}`);
  console.log(`Investments upserted: ${investCount}`);
  console.log('\nBRICS data seed completed successfully. No existing records were deleted.\n');

  await mongoose.connection.close();
  process.exit(0);
};

seedBricsData().catch((err) => {
  console.error('\nBRICS seed failed:', err.message);
  process.exit(1);
});