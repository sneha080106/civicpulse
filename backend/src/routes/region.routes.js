const express = require('express');
const { getRegionById } = require('../controllers/region.controller');

const router = express.Router();

router.get('/:id', getRegionById);

module.exports = router;