const express = require('express');
const { listUsers, createStaffUser, updateUser } = require('../controllers/admin.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');
const { ROLES } = require('../utils/roles');

const router = express.Router();

// Account management is restricted to super-admins.
router.use(authenticate, authorize(ROLES.SUPER_ADMIN));

router.get('/users', listUsers);
router.post('/users', createStaffUser);
router.patch('/users/:id', updateUser);

module.exports = router;
