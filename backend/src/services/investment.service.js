const { round2, safeDivide } = require('../utils/scoring');

// Returns null (not 0) when coverage cannot be meaningfully computed.
const calculateInvestmentCoverageProxy = (totalInvestment, affectedPopulation) => {
  if (!affectedPopulation || affectedPopulation <= 0) return null;
  if (totalInvestment === null || totalInvestment === undefined) return null;
  return safeDivide(totalInvestment, affectedPopulation, null);
};

/**
 * Step 10, Section 16: proper min-max normalization across the analyzed
 * dataset's coverage proxies (NOT normalization against max alone).
 * If min === max, adequacy is defined as 50 (neutral — no discriminating
 * signal available). Missing coverage data is treated as worst-case (0
 * adequacy / 100 gap), flagged via `assumed: true`.
 */
const calculateInvestmentGap = (coverageProxy, minCoverage, maxCoverage) => {
  if (coverageProxy === null || coverageProxy === undefined) {
    return { investmentGap: 100, adequacyScore: 0, assumed: true };
  }
  if (minCoverage === null || maxCoverage === null || minCoverage === undefined || maxCoverage === undefined) {
    return { investmentGap: 50, adequacyScore: 50, assumed: true };
  }

  let adequacyScore;
  if (minCoverage === maxCoverage) {
    adequacyScore = 50;
  } else {
    adequacyScore = round2(((coverageProxy - minCoverage) / (maxCoverage - minCoverage)) * 100);
  }

  return { investmentGap: round2(100 - adequacyScore), adequacyScore, assumed: false };
};

module.exports = { calculateInvestmentCoverageProxy, calculateInvestmentGap };