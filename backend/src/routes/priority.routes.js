const express = require('express');
const {
  getPriorities,
  getPriorityById,
  recalculatePriorities,
} = require('../controllers/priority.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');

const router = express.Router();

// Read-only priority views stay public (Dashboard/Priorities pages).
router.get('/', getPriorities);
// Manual recalculation is an admin/policymaker management action.
router.post('/recalculate', authenticate, authorize('admin'), recalculatePriorities);
router.get('/:id', getPriorityById);

module.exports = router;