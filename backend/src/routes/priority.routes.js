const express = require('express');
const {
  getPriorities,
  getPriorityById,
  recalculatePriorities,
} = require('../controllers/priority.controller');

const router = express.Router();

router.get('/', getPriorities);
router.post('/recalculate', recalculatePriorities);
router.get('/:id', getPriorityById);

module.exports = router;