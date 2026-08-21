const express = require('express');
const { getCountries } = require('../controllers/country.controller');

const router = express.Router();
router.get('/', getCountries);

module.exports = router;