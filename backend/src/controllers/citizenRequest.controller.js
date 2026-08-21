const mongoose = require('mongoose');
const { resolveCountryName, DEFAULT_COUNTRY_CODE } = require('../config/countries');
const { generateRequestId } = require('../utils/requestId');
const { VALID_CATEGORIES, VALID_URGENCY } = require('../utils/requestValidation');

const createCitizenRequest = async (req, res, next) => {
  try {
    const CitizenRequest = mongoose.model('CitizenRequest');
    const {
      description, category, state, district, urgency,
      affectedPopulationEstimate, language, country
    } = req.body;

    const errors = [];
    if (!description || typeof description !== 'string' || description.trim().length === 0) errors.push('description is required');
    if (!category || !VALID_CATEGORIES.includes(category)) errors.push(`category is required and must be one of: ${VALID_CATEGORIES.join(', ')}`);
    if (!state || typeof state !== 'string' || state.trim().length === 0) errors.push('state is required');
    if (!district || typeof district !== 'string' || district.trim().length === 0) errors.push('district is required');
    if (!urgency || !VALID_URGENCY.includes(urgency)) errors.push(`urgency is required and must be one of: ${VALID_URGENCY.join(', ')}`);
    if (
      affectedPopulationEstimate !== undefined && affectedPopulationEstimate !== null && affectedPopulationEstimate !== '' &&
      (typeof affectedPopulationEstimate !== 'number' || affectedPopulationEstimate < 0 || Number.isNaN(affectedPopulationEstimate))
    ) errors.push('affectedPopulationEstimate must be a non-negative number if provided');

    if (errors.length > 0) {
      return res.status(400).json({ success: false, message: errors.join('; ') });
    }

    const finalLanguage = ['en', 'hi', 'bn'].includes(language) ? language : 'en';
    let requestId = await generateRequestId(CitizenRequest);
    let saved = null;

    for (let attempt = 0; attempt < 3 && !saved; attempt++) {
      try {
        const doc = new CitizenRequest({
          requestId,
          originalText: description.trim(),
          language: finalLanguage,
          category,
          problem: description.trim(),
          location: { country: resolveCountryName(country || DEFAULT_COUNTRY_CODE), state: state.trim(), district: district.trim() },
          locationConfidence: 'HIGH',
          urgency,
          source: 'text',
          affectedPopulationEstimate: affectedPopulationEstimate === undefined || affectedPopulationEstimate === '' ? null : affectedPopulationEstimate,
          // Step 14: record what the citizen explicitly chose, so a later
          // /analyze call knows not to overwrite it.
          citizenProvided: {
            category,
            urgency,
            state: state.trim(),
            district: district.trim(),
          },
        });
        saved = await doc.save();
      } catch (err) {
        if (err.code === 11000) { requestId = await generateRequestId(CitizenRequest); continue; }
        throw err;
      }
    }

    if (!saved) {
      return res.status(500).json({ success: false, message: 'Unable to generate a unique request ID' });
    }

    res.status(201).json({
      success: true,
      data: {
        requestId: saved.requestId,
        originalText: saved.originalText,
        category: saved.category,
        location: saved.location,
        urgency: saved.urgency,
        affectedPopulationEstimate: saved.affectedPopulationEstimate,
        status: 'received',
        timestamp: saved.timestamp,
      },
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { createCitizenRequest };