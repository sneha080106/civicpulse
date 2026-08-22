const VALID_CATEGORIES = [
  'Roads & Transport',
  'Healthcare',
  'Education',
  'Water & Sanitation',
  'Electricity',
  'Internet & Digital Connectivity',
  'Housing',
  'Public Safety',
  'Other',
];

const VALID_URGENCY = ['LOW', 'MEDIUM', 'HIGH'];
const VALID_LOCATION_CONFIDENCE = ['HIGH', 'MEDIUM', 'LOW'];
const VALID_LANGUAGES = ['en', 'hi', 'bn', 'te', 'mr', 'ta', 'gu', 'kn', 'ml', 'pa', 'or', 'as', 'ur'];

/**
 * Validates a raw AI extraction response against strict allow-lists and
 * numeric ranges. The AI is NEVER trusted blindly — every field must pass
 * here before it can be persisted or returned to the client.
 *
 * Returns { valid: true, data: normalizedData } or { valid: false, errors: [...] }.
 */
const validateAnalysis = (raw) => {
  const errors = [];

  if (!raw || typeof raw !== 'object') {
    return { valid: false, errors: ['AI response is not a valid object'] };
  }

  if (!VALID_LANGUAGES.includes(raw.language)) {
    errors.push(`Invalid language: ${raw.language}`);
  }

  if (typeof raw.translatedText !== 'string' || raw.translatedText.trim().length === 0) {
    errors.push('translatedText missing or empty');
  }

  if (!VALID_CATEGORIES.includes(raw.category)) {
    errors.push(`Invalid category: ${raw.category}`);
  }

  if (raw.subCategory !== undefined && raw.subCategory !== null && typeof raw.subCategory !== 'string') {
    errors.push('subCategory must be a string or null');
  }

  if (raw.problem !== undefined && raw.problem !== null && typeof raw.problem !== 'string') {
    errors.push('problem must be a string or null');
  }

  // location.* fields may legitimately be null — the AI must NEVER fabricate
  // a location it isn't confident about (Step 6, Section 9).
  if (!raw.location || typeof raw.location !== 'object') {
    errors.push('location must be an object');
  } else {
    ['country', 'state', 'district'].forEach((field) => {
      const value = raw.location[field];
      if (value !== null && value !== undefined && typeof value !== 'string') {
        errors.push(`location.${field} must be a string or null`);
      }
    });
  }

  if (!VALID_LOCATION_CONFIDENCE.includes(raw.locationConfidence)) {
    errors.push(`Invalid locationConfidence: ${raw.locationConfidence}`);
  }

  if (!VALID_URGENCY.includes(raw.urgency)) {
    errors.push(`Invalid urgency: ${raw.urgency}`);
  }

  if (typeof raw.confidence !== 'number' || Number.isNaN(raw.confidence) || raw.confidence < 0 || raw.confidence > 1) {
    errors.push(`Invalid confidence: ${raw.confidence} (must be a number between 0 and 1)`);
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  return {
    valid: true,
    data: {
      language: raw.language,
      translatedText: raw.translatedText.trim(),
      category: raw.category,
      subCategory: raw.subCategory || null,
      problem: raw.problem || null,
      location: {
        country: raw.location.country || null,
        state: raw.location.state || null,
        district: raw.location.district || null,
      },
      locationConfidence: raw.locationConfidence,
      urgency: raw.urgency,
      confidence: raw.confidence,
    },
  };
};

module.exports = { validateAnalysis, VALID_CATEGORIES, VALID_URGENCY, VALID_LOCATION_CONFIDENCE, VALID_LANGUAGES };