const express = require('express');
const { createCitizenRequest } = require('../controllers/citizenRequest.controller');
const { authenticate } = require('../middleware/auth.middleware');

const router = express.Router();

// Any logged-in user (citizen or admin) can submit a request.
router.post('/', authenticate, createCitizenRequest);

module.exports = router;