// Pure logic test — does NOT connect to MongoDB. All data is synthetic
// and in-memory, exercising the deterministic scoring functions directly.

const { calculateDemandScore } = require('../services/demand.service');
const { getInfrastructureGap } = require('../services/infrastructure.service');
const {
  calculateAffectedPopulation,
  calculatePopulationImpactScore,
} = require('../services/population.service');
const {
  calculateInvestmentCoverageProxy,
  calculateInvestmentGap,
} = require('../services/investment.service');
const { calculateUrgencyScore, computePriorityScore } = require('../services/priority.service');

const printResult = (label, result) => {
  console.log(`\n${label}`);
  console.log(`Demand Score: ${result.demandScore}`);
  console.log(`Infrastructure Gap: ${result.infrastructureGap}`);
  console.log(`Population Impact: ${result.populationImpact}`);
  console.log(`Urgency: ${result.urgencyScore}`);
  console.log(`Investment Gap: ${result.investmentGap}`);
  console.log(`Priority Score: ${result.priorityScore}`);
};

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

console.log('=== CivicPulse Priority Engine Test ===');

let passCount = 0;
let failCount = 0;

// ---------------------------------------------------------------
// Scenario 1: High demand + poor infrastructure + high urgency
// -> should produce a high priority score.
// ---------------------------------------------------------------
try {
  const demandScore = calculateDemandScore(412, 82000);

  const infrastructureGap = getInfrastructureGap('Roads & Transport', { roadConnectivityIndex: 38 });

  const affectedPopulation = calculateAffectedPopulation(82000, infrastructureGap);
  const maxAffectedPopulation = Math.max(affectedPopulation, 20000, 15000);
  const populationImpact = calculatePopulationImpactScore(affectedPopulation, maxAffectedPopulation);

  const requests = Array.from({ length: 10 }, (_, idx) => ({ urgency: idx < 8 ? 'HIGH' : 'MEDIUM' }));
  const urgencyScore = calculateUrgencyScore(requests);

  const coverageProxy = calculateInvestmentCoverageProxy(50000, affectedPopulation);
  const maxCoverageProxy = Math.max(coverageProxy, 5, 8);
  const { investmentGap } = calculateInvestmentGap(coverageProxy, maxCoverageProxy);

  const result = computePriorityScore({ demandScore, infrastructureGap, populationImpact, urgencyScore, investmentGap });
  printResult('Scenario 1: High demand + poor infrastructure + high urgency', result);

  assert(Number.isFinite(result.priorityScore), 'priorityScore must be finite');
  assert(result.priorityScore > 60, 'expected a high priority score');
  console.log('PASS');
  passCount++;
} catch (err) {
  console.log('FAIL:', err.message);
  failCount++;
}

// ---------------------------------------------------------------
// Scenario 2: Low demand + good infrastructure -> lower priority score.
// ---------------------------------------------------------------
try {
  const demandScore = calculateDemandScore(5, 100000);

  const infrastructureGap = getInfrastructureGap('Roads & Transport', { roadConnectivityIndex: 90 });

  const affectedPopulation = calculateAffectedPopulation(100000, infrastructureGap);
  const maxAffectedPopulation = Math.max(affectedPopulation, 50000, 60000);
  const populationImpact = calculatePopulationImpactScore(affectedPopulation, maxAffectedPopulation);

  const requests = Array.from({ length: 5 }, () => ({ urgency: 'LOW' }));
  const urgencyScore = calculateUrgencyScore(requests);

  const coverageProxy = calculateInvestmentCoverageProxy(400000, affectedPopulation);
  const maxCoverageProxy = Math.max(coverageProxy, 10, 20);
  const { investmentGap } = calculateInvestmentGap(coverageProxy, maxCoverageProxy);

  const result = computePriorityScore({ demandScore, infrastructureGap, populationImpact, urgencyScore, investmentGap });
  printResult('Scenario 2: Low demand + good infrastructure', result);

  assert(Number.isFinite(result.priorityScore), 'priorityScore must be finite');
  assert(result.priorityScore < 50, 'expected a lower priority score');
  console.log('PASS');
  passCount++;
} catch (err) {
  console.log('FAIL:', err.message);
  failCount++;
}

// ---------------------------------------------------------------
// Scenario 3: Zero population -> must not produce NaN or Infinity.
// ---------------------------------------------------------------
try {
  const demandScore = calculateDemandScore(50, 0);

  const infrastructureGap = getInfrastructureGap('Healthcare', { healthcareAccessIndex: 40 });

  const affectedPopulation = calculateAffectedPopulation(0, infrastructureGap);
  const populationImpact = calculatePopulationImpactScore(affectedPopulation, affectedPopulation);

  const urgencyScore = calculateUrgencyScore([]);

  const coverageProxy = calculateInvestmentCoverageProxy(10000, affectedPopulation);
  const { investmentGap } = calculateInvestmentGap(coverageProxy, coverageProxy);

  const result = computePriorityScore({ demandScore, infrastructureGap, populationImpact, urgencyScore, investmentGap });
  printResult('Scenario 3: Zero population', result);

  assert(Number.isFinite(result.priorityScore), 'priorityScore must not be NaN/Infinity');
  assert(!Number.isNaN(result.demandScore), 'demandScore must not be NaN');
  assert(affectedPopulation === 0, 'affectedPopulation should be 0 for zero population');
  console.log('PASS');
  passCount++;
} catch (err) {
  console.log('FAIL:', err.message);
  failCount++;
}

// ---------------------------------------------------------------
// Scenario 4: Unsupported sector -> must safely return unavailable infra data.
// ---------------------------------------------------------------
try {
  const infrastructureGap = getInfrastructureGap('Housing', { roadConnectivityIndex: 70 });
  assert(infrastructureGap === null, 'unsupported sector must return null, not a fabricated value');

  // Orchestrator-level fallback: treat as 0 for scoring purposes, with a warning (see priority.service.js)
  const fallbackGap = infrastructureGap === null ? 0 : infrastructureGap;
  const result = computePriorityScore({
    demandScore: 40,
    infrastructureGap: fallbackGap,
    populationImpact: 30,
    urgencyScore: 60,
    investmentGap: 50,
  });
  printResult('Scenario 4: Unsupported sector (Housing)', result);

  assert(Number.isFinite(result.priorityScore), 'priorityScore must be finite');
  console.log('PASS');
  passCount++;
} catch (err) {
  console.log('FAIL:', err.message);
  failCount++;
}

// ---------------------------------------------------------------
// Scenario 5: Missing investment -> must safely handle investment gap.
// ---------------------------------------------------------------
try {
  const affectedPopulation = calculateAffectedPopulation(60000, 45);
  const coverageProxy = calculateInvestmentCoverageProxy(null, affectedPopulation); // no investment record
  assert(coverageProxy === null, 'missing investment must yield null coverage proxy, not 0');

  const { investmentGap, assumed } = calculateInvestmentGap(coverageProxy, coverageProxy);
  assert(investmentGap === 100, 'missing investment must default to worst-case gap (100)');
  assert(assumed === true, 'result must flag that the gap was assumed, not calculated');

  const result = computePriorityScore({
    demandScore: 55,
    infrastructureGap: 45,
    populationImpact: 40,
    urgencyScore: 60,
    investmentGap,
  });
  printResult('Scenario 5: Missing investment record', result);

  assert(Number.isFinite(result.priorityScore), 'priorityScore must be finite');
  console.log('PASS');
  passCount++;
} catch (err) {
  console.log('FAIL:', err.message);
  failCount++;
}

console.log(`\n=== Test Summary: ${passCount} passed, ${failCount} failed ===\n`);
process.exit(failCount > 0 ? 1 : 0);