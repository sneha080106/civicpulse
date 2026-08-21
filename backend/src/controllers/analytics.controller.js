const mongoose = require('mongoose');
const { parseLimit, sanitizeFilterValue } = require('../utils/query');
const { regenerateAllPriorityResults } = require('../services/priorityGeneration.service');

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
const getHotspots = async (req, res, next) => {
  try {
    const PriorityResult = mongoose.model('PriorityResult');
    const Demographic = mongoose.model('Demographic');
    const limit = parseLimit(req.query.limit);
        const countryCode = sanitizeFilterValue(req.query.country);
    let hotspotFilter = {};
    if (countryCode) {
      const { resolveCountryName } = require('../config/countries');
      const countryName = resolveCountryName(countryCode);
      const matchingRegionIds = (await Demographic.find({ country: countryName })).map((d) => d.regionId);
      hotspotFilter = { regionId: { $in: matchingRegionIds } };
    }
    const results = await PriorityResult.find(hotspotFilter).sort({ priorityScore: -1 }).limit(limit);

    const regionIds = [...new Set(results.map((r) => r.regionId))];
    const demographics = await Demographic.find({ regionId: { $in: regionIds } });
    const stateByRegionId = new Map(demographics.map((d) => [d.regionId, d.stateProvince]));

    const hotspots = results.map((r) => ({
      regionId: r.regionId,
      district: r.district,
      state: stateByRegionId.get(r.regionId) || null,
      sector: r.sector,
      demandScore: r.demandScore,
      infrastructureGap: r.infrastructureGap,
      populationImpact: r.populationImpact,
      urgencyScore: r.urgencyScore,
      investmentGap: r.investmentGap,
      affectedPopulation: r.affectedPopulation,
      citizenRequestCount: r.citizenRequestCount,
      priorityScore: r.priorityScore,
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