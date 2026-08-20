const express = require('express');
const { getOverview, getHotspots, calculatePriorities } = require('../controllers/analytics.controller');

const router = express.Router();

router.get('/overview', getOverview);
router.get('/hotspots', getHotspots);
router.post('/calculate', calculatePriorities);

module.exports = router;