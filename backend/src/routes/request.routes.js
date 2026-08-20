const express = require('express');
const { getRequests, createRequest, analyzeRequest } = require('../controllers/request.controller');

const router = express.Router();

router.get('/', getRequests);
router.post('/', createRequest);
router.post('/analyze', analyzeRequest);

module.exports = router;