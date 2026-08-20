const { round2, normalizeToScore } = require('../utils/scoring');

const calculateAffectedPopulation = (population, infrastructureGap) => {
  if (!population || population <= 0) return 0;
  if (infrastructureGap === null || infrastructureGap === undefined || Number.isNaN(infrastructureGap)) {
    return 0;
  }
  return round2((population * infrastructureGap) / 100);
};

// Normalizes affectedPopulation against the max seen across the analyzed
// dataset (passed in by the caller). Division-by-zero is handled inside
// normalizeToScore, which returns 0 for a zero/undefined max.
const calculatePopulationImpactScore = (affectedPopulation, maxAffectedPopulation) =>
  round2(normalizeToScore(affectedPopulation, maxAffectedPopulation));

module.exports = { calculateAffectedPopulation, calculatePopulationImpactScore };