const mongoose = require('mongoose');
const { calculateDemandScore, calculateDemandRate } = require('./demand.service');
const { getInfrastructureIndex, getInfrastructureGap, isSectorSupported } = require('./infrastructure.service');
const { calculateAffectedPopulation, calculatePopulationImpactScore } = require('./population.service');
const { calculateInvestmentCoverageProxy, calculateInvestmentGap } = require('./investment.service');
const { calculateUrgencyScore, computePriorityScore } = require('./priority.service');
const { generateRecommendation } = require('./recommendation.service'); // Step 15
const { normalizeLocationKey } = require('../utils/locationMatch');

const round2Safe = (v) => (typeof v === 'number' && !Number.isNaN(v) ? Math.round(v * 100) / 100 : 0);

const generateAllPriorityResults = async () => {
  const CitizenRequest = mongoose.model('CitizenRequest');
  const Demographic = mongoose.model('Demographic');
  const Infrastructure = mongoose.model('Infrastructure');
  const Investment = mongoose.model('Investment');

  const combos = await CitizenRequest.aggregate([
  { $group: { _id: { district: '$location.district', sector: '$category', country: '$location.country' } } },
]);

  if (combos.length === 0) {
    return { results: [], warnings: ['No citizen requests found — nothing to analyze'] };
  }

  // Requests that differ only by casing/whitespace in country or district
  // ("Ranchi" / "ranchi" / " Ranchi ") belong to ONE group. The raw district
  // spellings are remembered so every variant's requests are still counted.
  const groups = new Map();
  for (const combo of combos) {
    const { sector, country } = combo._id;
    const district = combo._id.district === undefined ? null : combo._id.district;
    const groupKey = `${normalizeLocationKey(country)}::${normalizeLocationKey(district)}::${sector}`;
    if (!groups.has(groupKey)) groups.set(groupKey, { country, district, sector, rawDistricts: [] });
    const group = groups.get(groupKey);
    if (!group.rawDistricts.includes(district)) group.rawDistricts.push(district);
  }

  const demographicByDistrict = new Map(
    (await Demographic.find({})).map((d) => [`${normalizeLocationKey(d.country)}::${normalizeLocationKey(d.district)}`, d])
  );
  const infrastructureByRegionId = new Map((await Infrastructure.find({})).map((i) => [i.regionId, i]));

  const raw = [];
  for (const group of groups.values()) {
    const { sector, rawDistricts } = group;
    const warnings = [];

    const demographic = demographicByDistrict.get(
      `${normalizeLocationKey(group.country)}::${normalizeLocationKey(group.district)}`
    );
    if (!demographic) warnings.push(`Missing demographic record for district "${group.district}"`);
    // Report the region's canonical district name, not whichever spelling was typed.
    const district = demographic ? demographic.district : group.district;
    const regionId = demographic ? demographic.regionId : null;

    const population = demographic && typeof demographic.population === 'number' ? demographic.population : 0;
    if (population <= 0) warnings.push('Population is zero or unavailable');

    const infrastructure = regionId ? infrastructureByRegionId.get(regionId) : null;
    if (!infrastructure) warnings.push('Missing infrastructure record for region');
    if (!isSectorSupported(sector)) warnings.push(`Sector "${sector}" not supported for infrastructure gap`);

    const citizenRequests = await CitizenRequest.find({ 'location.district': { $in: rawDistricts }, category: sector });

    const demandRate = round2Safe(calculateDemandRate(citizenRequests.length, population));
    const demandScore = calculateDemandScore(citizenRequests.length, population);

    const infrastructureIndex = getInfrastructureIndex(sector, infrastructure);
    const infrastructureGapRaw = getInfrastructureGap(sector, infrastructure);
    if (infrastructureGapRaw === null) warnings.push('Infrastructure gap unavailable for this sector/region');
    const infrastructureGap = infrastructureGapRaw === null ? 0 : infrastructureGapRaw;

    const affectedPopulation = calculateAffectedPopulation(population, infrastructureGapRaw);
    const urgencyScore = calculateUrgencyScore(citizenRequests);

    let investment = null;
    if (regionId) investment = await Investment.findOne({ regionId, sector }).sort({ financialYear: -1 });
    if (!investment) warnings.push('No investment record found — investment gap defaults to worst-case (100)');

    const totalInvestment = investment ? (investment.existingInvestment || 0) + (investment.plannedInvestment || 0) : null;
    const coverageProxy = calculateInvestmentCoverageProxy(totalInvestment, affectedPopulation);

    raw.push({
      regionId, district, sector, demandRate, demandScore, infrastructureIndex, infrastructureGap,
      affectedPopulation, urgencyScore, totalInvestment, coverageProxy,
      citizenRequestCount: citizenRequests.length, warnings,
    });
  }

  const maxAffectedPopulation = Math.max(0, ...raw.map((r) => r.affectedPopulation || 0));
  const validProxies = raw.map((r) => r.coverageProxy).filter((v) => v !== null && v !== undefined);
  const minCoverage = validProxies.length > 0 ? Math.min(...validProxies) : null;
  const maxCoverage = validProxies.length > 0 ? Math.max(...validProxies) : null;

  const results = raw
    .filter((r) => r.regionId)
    .map((r) => {
      const populationImpact = calculatePopulationImpactScore(r.affectedPopulation, maxAffectedPopulation);
      const { investmentGap, assumed } = calculateInvestmentGap(r.coverageProxy, minCoverage, maxCoverage);
      if (assumed && !r.warnings.some((w) => w.includes('investment'))) {
        r.warnings.push('Investment gap could not be precisely determined — using a neutral/worst-case fallback');
      }

      const scoreResult = computePriorityScore({
        demandScore: r.demandScore, infrastructureGap: r.infrastructureGap, populationImpact,
        urgencyScore: r.urgencyScore, investmentGap,
      });

      return {
        regionId: r.regionId, district: r.district, sector: r.sector,
        priorityScore: scoreResult.priorityScore, demandScore: scoreResult.demandScore,
        infrastructureIndex: r.infrastructureIndex, infrastructureGap: scoreResult.infrastructureGap,
        populationImpact: scoreResult.populationImpact, affectedPopulation: r.affectedPopulation,
        urgencyScore: scoreResult.urgencyScore, investmentGap: scoreResult.investmentGap,
        citizenRequestCount: r.citizenRequestCount,
        evidence: { demandRate: r.demandRate, totalInvestment: r.totalInvestment, investmentCoverageProxy: r.coverageProxy },
        scoreBreakdown: scoreResult.contributions,
        warnings: r.warnings,
        calculatedAt: new Date(),
      };
    });

  return { results, warnings: [] };
};

// Deterministic — a function of regionId + sector ONLY, no timestamp/index.
// This is what makes the ID stable across recalculations (Issue 2 fix).
const buildPriorityId = (regionId, sector) =>
  `PR-${regionId}-${sector.replace(/[^a-zA-Z0-9]/g, '')}`;

/**
 * Step 14 (Issue 2 fix): upsert-by-natural-identity (regionId + sector)
 * instead of delete-everything-then-recreate. An existing district/sector
 * priority keeps the exact same priorityId across recalculations, so
 * /priorities/:id URLs stay valid as long as that combo still has citizen
 * requests behind it. Combos that no longer exist are removed explicitly
 * (not left stale indefinitely), and no duplicates can be created since the
 * upsert filter is the same {regionId, sector} pair every time.
 */
const regenerateAllPriorityResults = async () => {
  const PriorityResult = mongoose.model('PriorityResult');
  const { results, warnings } = await generateAllPriorityResults();

  if (results.length === 0) {
    const deleted = await PriorityResult.deleteMany({});
    return { count: 0, regionsAnalyzed: 0, staleRemoved: deleted.deletedCount, warnings };
  }

  const keptPriorityIds = [];

  for (const r of results) {
    const priorityId = buildPriorityId(r.regionId, r.sector);
    keptPriorityIds.push(priorityId);

     let recommendation = null;
    let recommendationDrivers = [];
    try {
      const generated = generateRecommendation({
        district: r.district,
        sector: r.sector,
        priorityScore: r.priorityScore,
        demandScore: r.demandScore,
        infrastructureGap: r.infrastructureGap,
        populationImpact: r.populationImpact,
        urgencyScore: r.urgencyScore,
        investmentGap: r.investmentGap,
      });
      recommendation = generated.recommendation;
      recommendationDrivers = generated.drivers;
    } catch (err) {
      console.error(`Recommendation generation failed for ${priorityId}:`, err);
      // recommendation stays null — score/evidence persistence continues unaffected below
    }

    await PriorityResult.findOneAndUpdate(
      { regionId: r.regionId, sector: r.sector }, // natural identity — upsert key
      {
        priorityId,
        regionId: r.regionId,
        district: r.district,
        sector: r.sector,
        priorityScore: r.priorityScore,
        demandScore: r.demandScore,
        infrastructureIndex: r.infrastructureIndex,
        infrastructureGap: r.infrastructureGap,
        populationImpact: r.populationImpact,
        affectedPopulation: r.affectedPopulation,
        urgencyScore: r.urgencyScore,
        investmentGap: r.investmentGap,
        citizenRequestCount: r.citizenRequestCount,
        evidence: r.evidence,
        scoreBreakdown: r.scoreBreakdown,
        recommendation,                  // <-- added: was computed above, never persisted
        recommendationDrivers, 
        warnings: r.warnings,
        calculatedAt: r.calculatedAt,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
  }

  const staleResult = await PriorityResult.deleteMany({ priorityId: { $nin: keptPriorityIds } });
  const regionsAnalyzed = new Set(results.map((r) => r.regionId)).size;

  return { count: keptPriorityIds.length, regionsAnalyzed, staleRemoved: staleResult.deletedCount, warnings };
};

module.exports = { generateAllPriorityResults, regenerateAllPriorityResults };