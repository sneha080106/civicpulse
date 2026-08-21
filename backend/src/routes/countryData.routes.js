const express = require('express');
const { getCountrySummary } = require('../controllers/countryData.controller');

const router = express.Router();
router.get('/:code/summary', getCountrySummary);

module.exports = router;