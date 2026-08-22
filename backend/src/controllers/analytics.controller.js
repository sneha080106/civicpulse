const mongoose = require('mongoose');
const { parseLimit, sanitizeFilterValue } = require('../utils/query');
const { regenerateAllPriorityResults } = require('../services/priorityGeneration.service');
const { getPriorityLevel, explainFactors } = require('../services/recommendation.service');

const getOverview = async (req, res, next) => {
  try {
    const CitizenRequest = mongoose.model('CitizenRequest');
    const PriorityResult = mongoose.model('PriorityResult');

    const totalRequests = await CitizenRequest.countDocuments();
    const regionsAnalyzed = (await CitizenRequest.distinct('location.district')).length;
    const languages = await CitizenRequest.distinct('language');

    const topConcernAgg = await CitizenRequest.aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 1 },
    ]);
    const topConcern = topConcernAgg.length > 0 ? topConcernAgg[0]._id : null;

    const topPriority = await PriorityResult.findOne().sort({ priorityScore: -1 });
    const highestPriorityRegion = topPriority ? topPriority.district : null;

    res.status(200).json({
      success: true,
      data: { totalRequests, regionsAnalyzed, topConcern, highestPriorityRegion, languages },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Step 11 change: added state, populationImpact, urgencyScore, investmentGap,
 * affectedPopulation, citizenRequestCount to the response so the map popup
 * has real backend fields to show — no new endpoint, same query/sort/limit
 * behavior as before. `state` is joined from Demographic (already stored,
 * not invented). Geographic coordinates are NOT included here — those stay
 * entirely in the frontend's static visualization mapping, per the
 * architectural separation the step requires.
 */

const { calculateHotspots } = require('../services/hotspotAggregation.service');

const getHotspots = async (req, res, next) => {
  try {
    const limit = parseLimit(req.query.limit);
    const countryCode = sanitizeFilterValue(req.query.country);

    let regionIdFilter = null;
    if (countryCode) {
      const { resolveCountryName } = require('../config/countries');
      const countryName = resolveCountryName(countryCode);
      const Demographic = mongoose.model('Demographic');
      regionIdFilter = (await Demographic.find({ country: countryName })).map((d) => d.regionId);
    }

    const allHotspots = await calculateHotspots(regionIdFilter);
    const hotspots = allHotspots.slice(0, limit).map((h) => ({
      regionId: h.regionId,
      district: h.district,
      state: h.state,
      sector: h.topSector, // top-demand sector within this region
      sectorCount: h.sectorCount,
      demandScore: null, // superseded at region level by citizenRequestCount volume — sector-level demandScore lives on Priority Ranking, not here
      infrastructureGap: h.infrastructureGap,
      populationImpact: null, // superseded at region level by affectedPopulation total — see note above
      urgencyScore: null,
      investmentGap: h.investmentGap,
      affectedPopulation: h.affectedPopulation,
      citizenRequestCount: h.citizenRequestCount,
      priorityScore: h.avgPriorityScore, // kept for backward compatibility with existing consumers of this field name
      hotspotScore: h.hotspotScore, // NEW — the genuinely distinct district-level score
      recommendation: h.recommendation,
      priorityLevel: getPriorityLevel(h.hotspotScore),
      whyHotspot: explainFactors({
        demandScore: h.citizenRequestCount ? Math.min(100, h.citizenRequestCount * 5) : 0, // rough volume-based signal for explanation text only, not used in hotspotScore itself
        infrastructureGap: h.infrastructureGap,
        populationImpact: null,
        urgencyScore: null,
        investmentGap: h.investmentGap,
        citizenRequestCount: h.citizenRequestCount,
      }).filter((f) => f.value >= 65).map((f) => f.factor),
    }));

    res.status(200).json({ success: true, hotspots });
  } catch (err) {
    next(err);
  }
};

const calculatePriorities = async (req, res, next) => {
  try {
    const { count, regionsAnalyzed, warnings } = await regenerateAllPriorityResults();
    res.status(200).json({
      status: 'success',
      regionsAnalyzed,
      priorityResultsCreated: count,
      ...(warnings && warnings.length > 0 ? { warnings } : {}),
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { getOverview, getHotspots, calculatePriorities };