// Manually creates (or promotes) one privileged account. There is no public
// endpoint that can create a super_admin — this script is the only way to
// mint that role (the first super_admin then creates officers/admins from the
// /admin panel).
//
// Usage:
//   npm run seed:admin -- --email root@civicpulse.in --password "StrongPass123" --name "Root" --role super_admin
//   npm run seed:admin -- --email admin@civicpulse.in --password "StrongPass123"          (role defaults to admin)
// or via env vars:
//   ADMIN_EMAIL=... ADMIN_PASSWORD="..." ADMIN_ROLE=super_admin npm run seed:admin

const connectDB = require('../config/db');
const mongoose = require('mongoose');
require('../models');
const { ROLES } = require('../utils/roles');

const SEEDABLE_ROLES = [ROLES.OFFICER, ROLES.ADMIN, ROLES.SUPER_ADMIN];

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
  const role = args.role || process.env.ADMIN_ROLE || ROLES.ADMIN;

  if (!email || !password) {
    console.error('Missing required admin credentials.');
    console.error('Pass --email and --password, or set ADMIN_EMAIL and ADMIN_PASSWORD.');
    process.exit(1);
  }
  if (!SEEDABLE_ROLES.includes(role)) {
    console.error(`Invalid role "${role}". Use one of: ${SEEDABLE_ROLES.join(', ')}`);
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
    if (existing.role === role) {
      console.log(`${role} account already exists for ${email}. No changes made.`);
    } else {
      existing.role = role;
      await existing.save();
      console.log(`Existing user ${email} set to ${role}.`);
    }
  } else {
    await User.create({ name, email, password, role });
    console.log(`${role} account created for ${email}.`);
  }

  await mongoose.connection.close();
  process.exit(0);
};

run().catch((err) => {
  console.error('seedAdmin script crashed:', err);
  process.exit(1);
});
