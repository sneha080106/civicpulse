const mongoose = require('mongoose');

/**
 * The list of regions the priority engine can actually recognize: the
 * Demographic collection (populated by `npm run seed` / `npm run seed:brics`).
 * Reusing it means the AI layer and the engine can never disagree about which
 * districts exist, and no second hardcoded list is needed.
 *
 * Returns [{ regionId, country, state, district }] sorted for stable output.
 * Never throws: if the lookup fails the caller simply gets an empty list and
 * analysis proceeds exactly as it did before region context existed.
 */
const getSupportedRegions = async () => {
  try {
    const Demographic = mongoose.model('Demographic');
    const docs = await Demographic.find({}, 'regionId country stateProvince district').lean();
    return docs
      .filter((d) => d.country && d.district)
      .map((d) => ({
        regionId: d.regionId,
        country: d.country,
        state: d.stateProvince || null,
        district: d.district,
      }))
      .sort((a, b) =>
        a.country.localeCompare(b.country) ||
        String(a.state).localeCompare(String(b.state)) ||
        a.district.localeCompare(b.district));
  } catch (err) {
    return [];
  }
};

module.exports = { getSupportedRegions };
