const express = require('express');
const { receiveMessage } = require('../controllers/messaging.controller');

const router = express.Router();
router.post('/webhook', receiveMessage);

module.exports = router;