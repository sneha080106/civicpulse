/**
 * Deterministic, evidence-driven recommendation generator. Runs strictly
 * downstream of the deterministic priority engine — it reads already-
 * computed scores and NEVER recalculates or influences them. No LLM,
 * per Step 15 Section 12: predictable, testable, works without an API key.
 *
 * Thresholds below are display/explanation conventions only (mirroring the
 * same idea as the map's Low/Medium/High/Critical bands) — they are not
 * part of, and do not feed back into, the priority formula or weights.
 */

const STRONG_SIGNAL_THRESHOLD = 65;

const buildDrivers = ({ demandScore, infrastructureGap, populationImpact, urgencyScore, investmentGap }) => {
  const drivers = [];
  if (typeof demandScore === 'number' && demandScore >= STRONG_SIGNAL_THRESHOLD) drivers.push('high citizen demand');
  if (typeof infrastructureGap === 'number' && infrastructureGap >= STRONG_SIGNAL_THRESHOLD) drivers.push('a significant infrastructure gap');
  if (typeof populationImpact === 'number' && populationImpact >= STRONG_SIGNAL_THRESHOLD) drivers.push('high population impact');
  if (typeof urgencyScore === 'number' && urgencyScore >= STRONG_SIGNAL_THRESHOLD) drivers.push('high urgency among citizen reports');
  if (typeof investmentGap === 'number' && investmentGap >= STRONG_SIGNAL_THRESHOLD) drivers.push('a large relative investment gap');
  return drivers;
};

const joinDrivers = (drivers) => {
  if (drivers.length === 0) return null;
  if (drivers.length === 1) return drivers[0];
  return `${drivers.slice(0, -1).join(', ')} and ${drivers[drivers.length - 1]}`;
};

/**
 * generateRecommendation(evidence) -> { recommendation: string, drivers: string[] }
 * evidence: { district, sector, priorityScore, demandScore, infrastructureGap,
 *             populationImpact, urgencyScore, investmentGap }
 * Never throws — worst case returns a safe generic-but-still-evidence-based
 * fallback, so a malformed input can never break priority calculation
 * (Step 15 Section 13).
 */
const generateRecommendation = (evidence = {}) => {
  const {
    district, sector, priorityScore,
    demandScore, infrastructureGap, populationImpact, urgencyScore, investmentGap,
  } = evidence;

  const districtLabel = district || 'This region';
  const sectorLabel = sector || 'this sector';
  const score = typeof priorityScore === 'number' && !Number.isNaN(priorityScore) ? priorityScore : 0;

  const drivers = buildDrivers({ demandScore, infrastructureGap, populationImpact, urgencyScore, investmentGap });
  const driverPhrase = joinDrivers(drivers);

  let recommendation;
  if (score >= 65) {
    recommendation = driverPhrase
      ? `Prioritize ${sectorLabel} interventions in ${districtLabel}, driven by ${driverPhrase}. This combination indicates a strong case for near-term policy attention and targeted public investment.`
      : `Prioritize ${sectorLabel} interventions in ${districtLabel}. The combined weighted evidence places this among the higher-priority cases, even without one single dominant factor.`;
  } else if (score >= 35) {
    recommendation = driverPhrase
      ? `Plan a targeted ${sectorLabel} intervention in ${districtLabel}, given ${driverPhrase}. This warrants active planning, though it is not yet at the most urgent tier.`
      : `Monitor ${sectorLabel} conditions in ${districtLabel} and prepare a contingency intervention plan, based on the combined weighted evidence.`;
  } else {
    recommendation = `Continue monitoring ${sectorLabel} demand and infrastructure conditions in ${districtLabel} while prioritizing higher-scoring interventions elsewhere.`;
  }

  return { recommendation, drivers };
};

// Step 21: priority-level label for display only — derived from the
// existing priorityScore, does not alter it.
const getPriorityLevel = (score) => {
  if (typeof score !== 'number' || Number.isNaN(score)) return 'UNKNOWN';
  if (score >= 65) return 'HIGH';
  if (score >= 35) return 'MEDIUM';
  return 'LOW';
};

// Step 21: human-readable per-factor explanations, built ONLY from
// deterministic values already computed by the priority engine — no LLM,
// no chain-of-thought, no fabricated data. Mirrors buildDrivers() logic
// but returns descriptive sentences instead of short labels.
const explainFactors = ({ demandScore, infrastructureGap, populationImpact, urgencyScore, investmentGap, citizenRequestCount }) => {
  const explanations = [];

  if (typeof demandScore === 'number') {
    explanations.push({
      factor: 'Citizen Demand',
      value: demandScore,
      description: citizenRequestCount
        ? `${citizenRequestCount} citizen request(s) recorded — ${demandScore >= 65 ? 'high demand from citizens in this region.' : demandScore >= 35 ? 'moderate citizen demand.' : 'relatively low citizen demand so far.'}`
        : 'No citizen request count available.',
    });
  }
  if (typeof infrastructureGap === 'number') {
    explanations.push({
      factor: 'Infrastructure Gap',
      value: infrastructureGap,
      description: infrastructureGap >= 65
        ? 'The region has a significant infrastructure deficit in this sector.'
        : infrastructureGap >= 35
        ? 'The region has a moderate infrastructure gap in this sector.'
        : 'Infrastructure in this sector is relatively strong.',
    });
  }
  if (typeof populationImpact === 'number') {
    explanations.push({
      factor: 'Population Impact',
      value: populationImpact,
      description: populationImpact >= 65
        ? 'A large potentially affected population could benefit from intervention, relative to other analyzed regions.'
        : 'A smaller potentially affected population, relative to other analyzed regions.',
    });
  }
  if (typeof urgencyScore === 'number') {
    explanations.push({
      factor: 'Urgency',
      value: urgencyScore,
      description: urgencyScore >= 65
        ? 'Citizen reports for this sector indicate high urgency.'
        : 'Citizen reports indicate low-to-moderate urgency.',
    });
  }
  if (typeof investmentGap === 'number') {
    explanations.push({
      factor: 'Investment Gap (Relative)',
      value: investmentGap,
      description: investmentGap >= 65
        ? 'Current/planned investment does not appear to adequately cover the identified need, relative to other analyzed regions.'
        : 'Investment coverage appears relatively more adequate compared to other analyzed regions.',
    });
  }

  return explanations;
};

module.exports = { generateRecommendation, getPriorityLevel, explainFactors };