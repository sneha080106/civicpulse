const mongoose = require('mongoose');
const { ROLES, ASSIGNABLE_ROLES } = require('../utils/roles');

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const fail = (res, status, message) => res.status(status).json({ success: false, message });

// GET /api/admin/users?role=officer
const listUsers = async (req, res, next) => {
  try {
    const User = mongoose.model('User');
    const filter = {};
    if (typeof req.query.role === 'string' && Object.values(ROLES).includes(req.query.role)) {
      filter.role = req.query.role;
    }
    const users = await User.find(filter).sort({ createdAt: -1 });
    res.status(200).json({ success: true, count: users.length, users: users.map((u) => u.toPublic()) });
  } catch (err) {
    next(err);
  }
};

// POST /api/admin/users  — create an officer or admin account.
const createStaffUser = async (req, res, next) => {
  try {
    const User = mongoose.model('User');
    const { name, email, password, role, department } = req.body;

    const errors = [];
    if (!email || typeof email !== 'string' || !EMAIL_REGEX.test(email)) errors.push('a valid email is required');
    if (!password || typeof password !== 'string' || password.length < 8) {
      errors.push('password is required and must be at least 8 characters');
    }
    if (![ROLES.OFFICER, ROLES.ADMIN].includes(role)) errors.push('role must be "officer" or "admin"');
    if (errors.length > 0) return fail(res, 400, errors.join('; '));

    const normalizedEmail = email.toLowerCase().trim();
    if (await User.findOne({ email: normalizedEmail })) {
      return fail(res, 409, 'An account with this email already exists.');
    }

    const user = await User.create({
      name: name ? String(name).trim() : undefined,
      email: normalizedEmail,
      password,
      role,
      department: department ? String(department).trim() : null,
    });

    res.status(201).json({ success: true, data: user.toPublic() });
  } catch (err) {
    if (err.code === 11000) return fail(res, 409, 'An account with this email already exists.');
    next(err);
  }
};

// PATCH /api/admin/users/:id — change role, department, or active status.
const updateUser = async (req, res, next) => {
  try {
    const User = mongoose.model('User');
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return fail(res, 400, 'Invalid user id.');

    const target = await User.findById(id);
    if (!target) return fail(res, 404, 'User not found.');

    // Guardrails: nobody edits a super-admin through the API, and nobody
    // locks themselves out.
    if (target.role === ROLES.SUPER_ADMIN) {
      return fail(res, 403, 'Super-admin accounts cannot be modified through the API.');
    }
    const isSelf = target._id.toString() === req.user.id;

    const { role, isActive, department, name } = req.body;

    if (role !== undefined) {
      if (!ASSIGNABLE_ROLES.includes(role)) {
        return fail(res, 400, `role must be one of: ${ASSIGNABLE_ROLES.join(', ')}`);
      }
      if (isSelf) return fail(res, 400, 'You cannot change your own role.');
      target.role = role;
    }
    if (isActive !== undefined) {
      if (typeof isActive !== 'boolean') return fail(res, 400, 'isActive must be true or false.');
      if (isSelf && !isActive) return fail(res, 400, 'You cannot deactivate your own account.');
      target.isActive = isActive;
    }
    if (department !== undefined) target.department = department ? String(department).trim() : null;
    if (name !== undefined) target.name = name ? String(name).trim() : undefined;

    await target.save();
    res.status(200).json({ success: true, data: target.toPublic() });
  } catch (err) {
    next(err);
  }
};

module.exports = { listUsers, createStaffUser, updateUser };
