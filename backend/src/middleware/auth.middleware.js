const mongoose = require('mongoose');
const { verifyToken } = require('../utils/jwt');

// Verifies the JWT (Authorization: Bearer <token>), then loads the user from
// the database and attaches { id, role, email } to req.user.
//
// The role is read from the DATABASE, not from the token. That means if a
// super-admin changes someone's role or deactivates their account, it takes
// effect on their very next request instead of waiting for the token to expire.
const authenticate = async (req, res, next) => {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return res.status(401).json({ success: false, message: 'Authentication required. Please log in.' });
  }

  let decoded;
  try {
    decoded = verifyToken(token);
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Invalid or expired session. Please log in again.' });
  }

  try {
    const User = mongoose.model('User');
    const user = await User.findById(decoded.sub).select('email role isActive');
    if (!user || user.isActive === false) {
      return res.status(401).json({ success: false, message: 'This account is no longer active.' });
    }
    req.user = { id: user._id.toString(), role: user.role, email: user.email };
    return next();
  } catch (err) {
    return next(err);
  }
};

// Usage: authorize(ROLES.ADMIN, ROLES.SUPER_ADMIN)
// Must run after authenticate.
const authorize = (...allowedRoles) => (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ success: false, message: 'Authentication required. Please log in.' });
  }
  if (!allowedRoles.includes(req.user.role)) {
    return res.status(403).json({ success: false, message: 'You do not have permission to perform this action.' });
  }
  next();
};

module.exports = { authenticate, authorize };
