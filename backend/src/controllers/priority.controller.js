const mongoose = require('mongoose');
const { parseLimit, sanitizeFilterValue } = require('../utils/query');
const { regenerateAllPriorityResults } = require('../services/priorityGeneration.service');

const getPriorities = async (req, res, next) => {
  try {
    const PriorityResult = mongoose.model('PriorityResult');
    const limit = parseLimit(req.query.limit);

    const filter = {};
    const sector = sanitizeFilterValue(req.query.sector);
    const district = sanitizeFilterValue(req.query.district);
    if (sector) filter.sector = sector;
    if (district) filter.district = district;
    const mongoose2 = mongoose; // already imported at top, reuse
    const countryCode = sanitizeFilterValue(req.query.country);
if (countryCode) {
  const { resolveCountryName } = require('../config/countries');
  const countryName = resolveCountryName(countryCode);
  const Demographic = mongoose.model('Demographic');
  const matchingRegionIds = (await Demographic.find({ country: countryName })).map((d) => d.regionId);
  filter.regionId = { $in: matchingRegionIds };
}
    const results = await PriorityResult.find(filter).sort({ priorityScore: -1 }).limit(limit);

    const priorities = results.map((r, index) => ({
      rank: index + 1,
      priorityId: r.priorityId, // Step 14 hotfix: was missing — this is the field /api/priorities/:id actually looks up by
      regionId: r.regionId,
      district: r.district,
      sector: r.sector,
      priorityScore: r.priorityScore,
      demandScore: r.demandScore,
      infrastructureGap: r.infrastructureGap,
      affectedPopulation: r.affectedPopulation,
      urgencyScore: r.urgencyScore,
      investmentGap: r.investmentGap,
      citizenRequestCount: r.citizenRequestCount,
    }));

       res.status(200).json({ success: true, count: priorities.length, priorities });
  } catch (err) {
    next(err);
  
  
  } 
};

const getPriorityById = async (req, res, next) => {
  try {
    const PriorityResult = mongoose.model('PriorityResult');
    const result = await PriorityResult.findOne({ priorityId: req.params.id });

    if (!result) {
      return res.status(404).json({ success: false, message: `Priority result "${req.params.id}" not found` });
    }

    res.status(200).json({
      success: true,
      priority: {
        priorityId: result.priorityId,
        regionId: result.regionId,
        district: result.district,
        sector: result.sector,
        priorityScore: result.priorityScore,
        demandScore: result.demandScore,
        infrastructureIndex: result.infrastructureIndex,
        infrastructureGap: result.infrastructureGap,
        populationImpact: result.populationImpact,
        affectedPopulation: result.affectedPopulation,
        urgencyScore: result.urgencyScore,
        investmentGap: result.investmentGap,
        citizenRequestCount: result.citizenRequestCount,
        evidence: result.evidence,
        scoreBreakdown: result.scoreBreakdown,
        recommendation: result.recommendation ?? null,
        recommendationDrivers: result.recommendationDrivers ?? [],
      },
    });
  } catch (err) {
    next(err);
  }
};

// Kept for backward compatibility with anything still calling this route;
// POST /api/analytics/calculate is the endpoint Step 10 specifies.
const recalculatePriorities = async (req, res, next) => {
  try {
    const { count, warnings } = await regenerateAllPriorityResults();
    res.status(200).json({
      success: true,
      message: 'Priority analysis recalculated successfully',
      resultsGenerated: count,
      ...(warnings && warnings.length > 0 ? { warnings } : {}),
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { getPriorities, getPriorityById, recalculatePriorities };