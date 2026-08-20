const mongoose = require('mongoose');
const { round2, clamp } = require('../utils/scoring');
const { calculateDemandScore } = require('./demand.service');
const { getInfrastructureGap, isSectorSupported } = require('./infrastructure.service');
const {
  calculateAffectedPopulation,
  calculatePopulationImpactScore,
} = require('./population.service');
const {
  calculateInvestmentCoverageProxy,
  calculateInvestmentGap,
} = require('./investment.service');

const WEIGHTS = {
  demand: 0.25,
  infrastructure: 0.25,
  population: 0.2,
  urgency: 0.15,
  investment: 0.15,
};

const URGENCY_WEIGHTS = { LOW: 25, MEDIUM: 60, HIGH: 100 };

const calculateUrgencyScore = (citizenRequests) => {
  if (!Array.isArray(citizenRequests) || citizenRequests.length === 0) return 0;
  const total = citizenRequests.reduce((sum, req) => {
    const weight = URGENCY_WEIGHTS[req.urgency];
    return sum + (typeof weight === 'number' ? weight : 0);
  }, 0);
  return round2(total / citizenRequests.length);
};

/**
 * Pure scoring function: takes already-computed 0-100 component scores and
 * returns the weighted priority score + per-component contributions.
 * No DB access — this is what testPriorityEngine.js exercises directly.
 */
const computePriorityScore = ({
  demandScore,
  infrastructureGap,
  populationImpact,
  urgencyScore,
  investmentGap,
}) => {
  const safe = (v) => (typeof v === 'number' && !Number.isNaN(v) ? clamp(v, 0, 100) : 0);

  const d = safe(demandScore);
  const i = safe(infrastructureGap);
  const p = safe(populationImpact);
  const u = safe(urgencyScore);
  const inv = safe(investmentGap);

  const demandContribution = round2(d * WEIGHTS.demand);
  const infrastructureContribution = round2(i * WEIGHTS.infrastructure);
  const populationContribution = round2(p * WEIGHTS.population);
  const urgencyContribution = round2(u * WEIGHTS.urgency);
  const investmentContribution = round2(inv * WEIGHTS.investment);

  const priorityScore = round2(
    demandContribution +
      infrastructureContribution +
      populationContribution +
      urgencyContribution +
      investmentContribution
  );

  return {
    demandScore: d,
    infrastructureGap: i,
    populationImpact: p,
    urgencyScore: u,
    investmentGap: inv,
    priorityScore,
    contributions: {
      demandContribution,
      infrastructureContribution,
      populationContribution,
      urgencyContribution,
      investmentContribution,
    },
  };
};

/**
 * DB-backed orchestrator.
 *
 * NORMALIZATION NOTE: populationImpact and investmentGap are defined as
 * normalized against "all analyzed district-sector combinations". This
 * function accepts an optional `context` object with precomputed dataset
 * maxima (maxAffectedPopulation, maxInvestmentCoverageProxy) from a batch
 * run elsewhere. Without context, it normalizes a value against itself,
 * which is a documented single-record limitation — batch callers should
 * always supply real dataset maxima.
 */
const calculatePriorityForRegionSector = async (regionId, sector, context = {}) => {
  const Demographic = mongoose.model('Demographic');
  const Infrastructure = mongoose.model('Infrastructure');
  const Investment = mongoose.model('Investment');
  const CitizenRequest = mongoose.model('CitizenRequest');

  const warnings = [];

  const demographic = await Demographic.findOne({ regionId });
  if (!demographic) warnings.push('Missing demographic record for regionId');

  const infrastructure = await Infrastructure.findOne({ regionId });
  if (!infrastructure) warnings.push('Missing infrastructure record for regionId');

  if (!isSectorSupported(sector)) {
    warnings.push(`Sector "${sector}" is not supported for infrastructure gap calculation`);
  }

  const investment = await Investment.findOne({ regionId, sector }).sort({ financialYear: -1 });
  if (!investment) warnings.push('No investment record found — investment gap defaulted to worst-case (100)');

  const population = demographic && typeof demographic.population === 'number' ? demographic.population : 0;
  if (population <= 0) warnings.push('Population is zero or unavailable');

  const citizenRequests = demographic
    ? await CitizenRequest.find({ 'location.district': demographic.district, category: sector })
    : [];
  if (citizenRequests.length === 0) warnings.push('No matching citizen requests found');

  const demandScore = calculateDemandScore(citizenRequests.length, population);

  const infrastructureGapRaw = getInfrastructureGap(sector, infrastructure);
  if (infrastructureGapRaw === null) warnings.push('Infrastructure gap unavailable for this sector/region');
  const infrastructureGap = infrastructureGapRaw === null ? 0 : infrastructureGapRaw;

  const affectedPopulation = calculateAffectedPopulation(population, infrastructureGapRaw);
  const maxAffectedPopulation = context.maxAffectedPopulation ?? affectedPopulation;
  const populationImpact = calculatePopulationImpactScore(affectedPopulation, maxAffectedPopulation);

  const urgencyScore = calculateUrgencyScore(citizenRequests);

  const totalInvestment = investment
    ? (investment.existingInvestment || 0) + (investment.plannedInvestment || 0)
    : null;
  const coverageProxy = calculateInvestmentCoverageProxy(totalInvestment, affectedPopulation);
  const maxCoverageProxy = context.maxInvestmentCoverageProxy ?? coverageProxy;
  const { investmentGap, assumed } = calculateInvestmentGap(coverageProxy, maxCoverageProxy);
  if (assumed) warnings.push('Investment gap assumed worst-case due to missing investment/coverage data');

  const scoreResult = computePriorityScore({
    demandScore,
    infrastructureGap,
    populationImpact,
    urgencyScore,
    investmentGap,
  });

  return {
    regionId,
    district: demographic ? demographic.district : null,
    sector,
    ...scoreResult,
    affectedPopulation,
    citizenRequestCount: citizenRequests.length,
    warnings,
    calculatedAt: new Date(),
  };
};

// Persistence is kept fully separate from calculation, per architecture rules.
const savePriorityResult = async (result) => {
  const PriorityResult = mongoose.model('PriorityResult');
  const priorityId = `PR-${result.regionId}-${result.sector}-${Date.now()}`;

  const doc = new PriorityResult({
    priorityId,
    regionId: result.regionId,
    district: result.district,
    sector: result.sector,
    priorityScore: result.priorityScore,
    demandScore: result.demandScore,
    infrastructureGap: result.infrastructureGap,
    populationImpact: result.populationImpact,
    urgencyScore: result.urgencyScore,
    investmentGap: result.investmentGap,
    citizenRequestCount: result.citizenRequestCount,
    affectedPopulation: result.affectedPopulation,
    evidence: JSON.stringify(result.contributions),
    calculatedAt: result.calculatedAt,
  });

  return doc.save();
};

module.exports = {
  WEIGHTS,
  URGENCY_WEIGHTS,
  calculateUrgencyScore,
  computePriorityScore,
  calculatePriorityForRegionSector,
  savePriorityResult,
};