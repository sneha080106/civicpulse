const mongoose = require('mongoose');
const { resolveCountryName, DEFAULT_COUNTRY_CODE } = require('../config/countries');

/**
 * GET /api/country-data/:code/summary
 * Reads raw Demographic/Infrastructure/Investment data directly — does NOT
 * touch the priority engine or PriorityResult in any way. This exists so
 * a country with region data but zero citizen requests (and therefore zero
 * PriorityResults) still has something genuine to show on the dashboard,
 * per Step 15 Section 6/8 — never fabricated, always real DB aggregates.
 */
const getCountrySummary = async (req, res, next) => {
  try {
    const Demographic = mongoose.model('Demographic');
    const Infrastructure = mongoose.model('Infrastructure');
    const Investment = mongoose.model('Investment');

    const countryCode = req.params.code || DEFAULT_COUNTRY_CODE;
    const countryName = resolveCountryName(countryCode);

    const demographics = await Demographic.find({ country: countryName });
    const regionIds = demographics.map((d) => d.regionId);

    if (regionIds.length === 0) {
      return res.status(200).json({
        success: true,
        data: {
          country: countryName,
          regionsAvailable: 0,
          totalPopulation: 0,
          avgInfrastructureIndex: null,
          totalInvestment: null,
        },
      });
    }

    const infrastructures = await Infrastructure.find({ regionId: { $in: regionIds } });
    const investments = await Investment.find({ regionId: { $in: regionIds } });

    const totalPopulation = demographics.reduce((sum, d) => sum + (d.population || 0), 0);

    const infraIndexes = infrastructures.flatMap((i) => [
      i.roadConnectivityIndex, i.healthcareAccessIndex, i.educationAccessIndex,
      i.waterAccessIndex, i.electricityAccessIndex, i.internetAccessIndex,
    ]).filter((v) => typeof v === 'number');
    const avgInfrastructureIndex = infraIndexes.length > 0
      ? Math.round((infraIndexes.reduce((a, b) => a + b, 0) / infraIndexes.length) * 100) / 100
      : null;

    const totalInvestment = investments.length > 0
      ? investments.reduce((sum, inv) => sum + (inv.existingInvestment || 0) + (inv.plannedInvestment || 0), 0)
      : null;

    res.status(200).json({
      success: true,
      data: {
        country: countryName,
        regionsAvailable: regionIds.length,
        totalPopulation,
        avgInfrastructureIndex,
        totalInvestment,
      },
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { getCountrySummary };