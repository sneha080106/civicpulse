const express = require('express');
const { getRequests, createRequest, analyzeRequest } = require('../controllers/request.controller');
const { authenticate, authorize } = require('../middleware/auth.middleware');

const router = express.Router();

// Raw request listing exposes citizen-submitted content in bulk — admin only.
router.get('/', authenticate, authorize('admin'), getRequests);
// Any logged-in user (citizen or admin) can submit and analyze a request.
router.post('/', authenticate, createRequest);
router.post('/analyze', authenticate, analyzeRequest);

module.exports = router;