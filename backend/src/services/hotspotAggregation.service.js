const mongoose = require('mongoose');
const { round2, normalizeToScore } = require('../utils/scoring');

/**
 * Step 20 fix: a genuinely independent, district-level hotspot score,
 * distinct from the existing citizen-level (district+sector) priorityScore.
 *
 * This function ONLY READS PriorityResult — it never recalculates or
 * modifies any citizen-level score, and computePriorityScore() is never
 * called here. Aggregation happens ACROSS sectors within a district, which
 * priorityScore (a per-sector value) cannot represent by itself.
 */
const calculateHotspots = async (regionIdFilter = null) => {
  const PriorityResult = mongoose.model('PriorityResult');
  const Demographic = mongoose.model('Demographic');

  const query = regionIdFilter ? { regionId: { $in: regionIdFilter } } : {};
  const allResults = await PriorityResult.find(query);

  if (allResults.length === 0) return [];

  // --- Group by district (region), aggregating across all its sectors ---
  const byDistrict = new Map();
  for (const r of allResults) {
    const key = r.district;
    if (!byDistrict.has(key)) {
      byDistrict.set(key, { district: key, regionId: r.regionId, sectors: [] });
    }
    byDistrict.get(key).sectors.push(r);
  }

  const raw = Array.from(byDistrict.values()).map((entry) => {
    const { sectors } = entry;
    const totalRequestVolume = sectors.reduce((sum, s) => sum + (s.citizenRequestCount || 0), 0);
    const avgPriorityScore = round2(sectors.reduce((sum, s) => sum + (s.priorityScore || 0), 0) / sectors.length);
    const maxInfrastructureGap = Math.max(...sectors.map((s) => s.infrastructureGap || 0));
    const totalAffectedPopulation = sectors.reduce((sum, s) => sum + (s.affectedPopulation || 0), 0);
    const avgInvestmentGap = round2(sectors.reduce((sum, s) => sum + (s.investmentGap || 0), 0) / sectors.length);

    // The single sector driving the district's overall priority — used for
    // display ("top sector"), NOT re-used as the hotspot score itself.
    const topSectorEntry = sectors.reduce((best, s) => (s.priorityScore > best.priorityScore ? s : best), sectors[0]);

    return {
      district: entry.district,
      regionId: entry.regionId,
      topSector: topSectorEntry.sector,
      sectorCount: sectors.length,
      totalRequestVolume,
      avgPriorityScore,
      maxInfrastructureGap,
      totalAffectedPopulation,
      avgInvestmentGap,
      topSectorRecommendation: topSectorEntry.recommendation || null,
    };
  });

  // --- Min-max normalize each raw aggregate across the current district set ---
  const maxRequestVolume = Math.max(...raw.map((d) => d.totalRequestVolume), 0);
  const maxAvgPriority = Math.max(...raw.map((d) => d.avgPriorityScore), 0);
  const maxInfraGapAcrossDistricts = Math.max(...raw.map((d) => d.maxInfrastructureGap), 0);
  const maxAffectedPop = Math.max(...raw.map((d) => d.totalAffectedPopulation), 0);
  const maxInvestmentGapAcrossDistricts = Math.max(...raw.map((d) => d.avgInvestmentGap), 0);

  const hotspots = raw.map((d) => {
    const normRequestVolume = normalizeToScore(d.totalRequestVolume, maxRequestVolume);
    const normAvgPriority = normalizeToScore(d.avgPriorityScore, maxAvgPriority);
    const normInfraGap = normalizeToScore(d.maxInfrastructureGap, maxInfraGapAcrossDistricts);
    const normAffectedPop = normalizeToScore(d.totalAffectedPopulation, maxAffectedPop);
    const normInvestmentGap = normalizeToScore(d.avgInvestmentGap, maxInvestmentGapAcrossDistricts);

    const hotspotScore = round2(
      normRequestVolume * 0.30 +
      normAvgPriority * 0.25 +
      normInfraGap * 0.20 +
      normAffectedPop * 0.15 +
      normInvestmentGap * 0.10
    );

    return {
      district: d.district,
      regionId: d.regionId,
      topSector: d.topSector,
      sectorCount: d.sectorCount,
      citizenRequestCount: d.totalRequestVolume,
      avgPriorityScore: d.avgPriorityScore,
      infrastructureGap: d.maxInfrastructureGap,
      affectedPopulation: d.totalAffectedPopulation,
      investmentGap: d.avgInvestmentGap,
      recommendation: d.topSectorRecommendation,
      hotspotScore,
    };
  });

  // --- Attach state (existing Demographic join, unchanged pattern) ---
  const regionIds = [...new Set(hotspots.map((h) => h.regionId))];
  const demographics = await Demographic.find({ regionId: { $in: regionIds } });
  const stateByRegionId = new Map(demographics.map((dm) => [dm.regionId, dm.stateProvince]));

  return hotspots
    .map((h) => ({ ...h, state: stateByRegionId.get(h.regionId) || null }))
    .sort((a, b) => b.hotspotScore - a.hotspotScore);
};

module.exports = { calculateHotspots };