const { clamp, round2, safeDivide } = require('../utils/scoring');

// Prototype calibration threshold: 5 requests per 1,000 population = max demand score.
// NOT an official government standard — internal MVP heuristic only.
const DEMAND_RATE_THRESHOLD = 5;

const calculateDemandRate = (requestCount, population) => {
  if (!population || population <= 0) return 0;
  return safeDivide(requestCount, population) * 1000;
};

const calculateDemandScore = (requestCount, population) => {
  const demandRate = calculateDemandRate(requestCount, population);
  const score = (demandRate / DEMAND_RATE_THRESHOLD) * 100;
  return round2(clamp(score, 0, 100));
};

module.exports = { calculateDemandRate, calculateDemandScore, DEMAND_RATE_THRESHOLD };