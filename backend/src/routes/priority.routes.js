const express = require('express');
const {
  getPriorities,
  getPriorityById,
  recalculatePriorities,
} = require('../controllers/priority.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');
const { ADMIN_ROLES } = require('../utils/roles');

const router = express.Router();

// Read-only priority views stay public (Dashboard/Priorities pages).
router.get('/', getPriorities);
// Manual recalculation is a management action — admin and super_admin only.
router.post('/recalculate', authenticate, authorize(...ADMIN_ROLES), recalculatePriorities);
router.get('/:id', getPriorityById);

module.exports = router;
