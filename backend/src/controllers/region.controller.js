const mongoose = require('mongoose');

const getRegionById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const Demographic = mongoose.model('Demographic');
    const Infrastructure = mongoose.model('Infrastructure');
    const Investment = mongoose.model('Investment');
    const CitizenRequest = mongoose.model('CitizenRequest');
    const PriorityResult = mongoose.model('PriorityResult');

    const demographic = await Demographic.findOne({ regionId: id });
    if (!demographic) {
      return res.status(404).json({ success: false, message: `Region "${id}" not found` });
    }

    const infrastructure = await Infrastructure.findOne({ regionId: id });
    const investments = await Investment.find({ regionId: id });
    const priorities = await PriorityResult.find({ regionId: id }).sort({ priorityScore: -1 });
    const districtRequests = await CitizenRequest.find({ 'location.district': demographic.district });

    const bySectorCounts = {};
    districtRequests.forEach((request) => {
      bySectorCounts[request.category] = (bySectorCounts[request.category] || 0) + 1;
    });
    const bySector = Object.entries(bySectorCounts).map(([sector, count]) => ({ sector, count }));

    res.status(200).json({
      success: true,
      region: {
        regionId: demographic.regionId,
        district: demographic.district,
        demographics: demographic,
        infrastructure: infrastructure || null,
        investments,
        demand: {
          totalRequests: districtRequests.length,
          bySector,
        },
        priorities,
      },
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { getRegionById };