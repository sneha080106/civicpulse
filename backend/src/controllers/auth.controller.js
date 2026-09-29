const mongoose = require('mongoose');
const { signToken } = require('../utils/jwt');
const { ROLES } = require('../utils/roles');

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Public self-registration is intentionally citizen-only. Admin accounts are
// created out-of-band via the seed:admin script (see src/scripts/seedAdmin.js)
// so there is no open endpoint that can mint admin/policymaker access.
const register = async (req, res, next) => {
  try {
    const User = mongoose.model('User');
    const { name, email, password } = req.body;

    const errors = [];
    if (!email || !EMAIL_REGEX.test(email)) errors.push('a valid email is required');
    if (!password || typeof password !== 'string' || password.length < 8) {
      errors.push('password is required and must be at least 8 characters');
    }
    if (errors.length > 0) {
      return res.status(400).json({ success: false, message: errors.join('; ') });
    }

    const existing = await User.findOne({ email: email.toLowerCase().trim() });
    if (existing) {
      return res.status(409).json({ success: false, message: 'An account with this email already exists.' });
    }

    const user = await User.create({
      name: name ? name.trim() : undefined,
      email: email.toLowerCase().trim(),
      password,
      role: ROLES.CITIZEN,
    });

    const token = signToken(user);
    res.status(201).json({
      success: true,
      data: {
        token,
        user: user.toPublic(),
      },
    });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ success: false, message: 'An account with this email already exists.' });
    }
    next(err);
  }
};

const login = async (req, res, next) => {
  try {
    const User = mongoose.model('User');
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'email and password are required' });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() }).select('+password');
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    if (user.isActive === false) {
      return res.status(403).json({ success: false, message: 'This account has been deactivated. Contact your administrator.' });
    }

    user.lastLoginAt = new Date();
    await user.save();

    const token = signToken(user);
    res.status(200).json({
      success: true,
      data: {
        token,
        user: user.toPublic(),
      },
    });
  } catch (err) {
    next(err);
  }
};

// Lets the frontend confirm the current session/role after page reloads.
const getMe = async (req, res, next) => {
  try {
    const User = mongoose.model('User');
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }
    res.status(200).json({
      success: true,
      data: user.toPublic(),
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { register, login, getMe };
