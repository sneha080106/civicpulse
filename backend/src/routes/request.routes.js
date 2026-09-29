const express = require('express');
const { getRequests, createRequest, analyzeRequest } = require('../controllers/request.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');
const { STAFF_ROLES } = require('../utils/roles');

const router = express.Router();

// Raw request listing exposes citizen-submitted content in bulk — staff only
// (officer, admin, super_admin).
router.get('/', authenticate, authorize(...STAFF_ROLES), getRequests);
// Any logged-in user can submit and analyze a request.
router.post('/', authenticate, createRequest);
router.post('/analyze', authenticate, analyzeRequest);

module.exports = router;
