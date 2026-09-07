// Manually creates (or promotes) exactly one admin account. There is no
// public admin-registration endpoint on purpose — this script is the only
// way to mint admin/policymaker access.
//
// Usage:
//   node src/scripts/seedAdmin.js --email admin@civicpulse.in --password "StrongPass123" --name "CivicPulse Admin"
// or via env vars:
//   ADMIN_EMAIL=admin@civicpulse.in ADMIN_PASSWORD="StrongPass123" npm run seed:admin

const connectDB = require('../config/db');
const mongoose = require('mongoose');
require('../models');

const parseArgs = () => {
  const args = process.argv.slice(2);
  const parsed = {};
  for (let i = 0; i < args.length; i += 1) {
    if (args[i].startsWith('--')) {
      const key = args[i].slice(2);
      parsed[key] = args[i + 1];
      i += 1;
    }
  }
  return parsed;
};

const run = async () => {
  const args = parseArgs();
  const email = (args.email || process.env.ADMIN_EMAIL || '').toLowerCase().trim();
  const password = args.password || process.env.ADMIN_PASSWORD;
  const name = args.name || process.env.ADMIN_NAME || 'Admin';

  if (!email || !password) {
    console.error('Missing required admin credentials.');
    console.error('Pass --email and --password, or set ADMIN_EMAIL and ADMIN_PASSWORD.');
    process.exit(1);
  }
  if (password.length < 8) {
    console.error('Password must be at least 8 characters.');
    process.exit(1);
  }

  await connectDB();
  const User = mongoose.model('User');

  const existing = await User.findOne({ email });
  if (existing) {
    if (existing.role === 'admin') {
      console.log(`Admin account already exists for ${email}. No changes made.`);
    } else {
      existing.role = 'admin';
      await existing.save();
      console.log(`Existing user ${email} promoted to admin.`);
    }
  } else {
    await User.create({ name, email, password, role: 'admin' });
    console.log(`Admin account created for ${email}.`);
  }

  await mongoose.connection.close();
  process.exit(0);
};

run().catch((err) => {
  console.error('seedAdmin script crashed:', err);
  process.exit(1);
});
