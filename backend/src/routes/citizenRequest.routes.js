const express = require('express');
const { createCitizenRequest } = require('../controllers/citizenRequest.controller');

const router = express.Router();

router.post('/', createCitizenRequest);

module.exports = router;