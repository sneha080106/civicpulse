const mongoose = require('mongoose');
const { sanitizeFilterValue } = require('../utils/query');
const { analyzeCitizenRequest } = require('../services/ai/requestAnalysis.service');
const { generateRequestId } = require('../utils/requestId');

const getRequests = async (req, res, next) => {
  try {
    const CitizenRequest = mongoose.model('CitizenRequest');
    const filter = {};
    const country = sanitizeFilterValue(req.query.country);
    const district = sanitizeFilterValue(req.query.district);
    const category = sanitizeFilterValue(req.query.category);
    const language = sanitizeFilterValue(req.query.language);
    if (country) filter['location.country'] = country;
    if (district) filter['location.district'] = district;
    if (category) filter.category = category;
    if (language) filter.language = language;

    const requests = await CitizenRequest.find(filter).sort({ timestamp: -1 });
    res.status(200).json({ success: true, count: requests.length, requests });
  } catch (err) {
    next(err);
  }
};

const ALLOWED_SOURCES = ['text', 'voice', 'messaging'];
const ALLOWED_LANGUAGES = ['en', 'hi', 'bn'];

const createCitizenRequestCore = async ({
  originalText, source, language, country, channel, senderId, messageId, sourceLanguageLabel,
}) => {
  const CitizenRequest = mongoose.model('CitizenRequest');
  const { resolveCountryName, DEFAULT_COUNTRY_CODE } = require('../config/countries');

  if (!originalText || typeof originalText !== 'string' || originalText.trim().length === 0) {
    const err = new Error('originalText is required');
    err.statusCode = 400;
    throw err;
  }

  let finalSource = 'text';
  if (source !== undefined && source !== null) {
    if (!ALLOWED_SOURCES.includes(source)) {
      const err = new Error(`Invalid source "${source}". Must be one of: ${ALLOWED_SOURCES.join(', ')}`);
      err.statusCode = 400;
      throw err;
    }
    finalSource = source;
  }

  let finalLanguage = 'en';
  if (language !== undefined && language !== null) {
    if (!ALLOWED_LANGUAGES.includes(language)) {
      const err = new Error(`Invalid language "${language}". Must be one of: ${ALLOWED_LANGUAGES.join(', ')}`);
      err.statusCode = 400;
      throw err;
    }
    finalLanguage = language;
  }

  let requestId = await generateRequestId(CitizenRequest);
  let saved = null;

  for (let attempt = 0; attempt < 3 && !saved; attempt++) {
    try {
      const doc = new CitizenRequest({
        requestId,
        originalText: originalText.trim(),
        language: finalLanguage,
        category: 'Other',
        source: finalSource,
        ...(country ? { location: { country: resolveCountryName(country || DEFAULT_COUNTRY_CODE) } } : {}),
        ...(channel !== undefined ? { channel } : {}),
        ...(senderId !== undefined ? { senderId } : {}),
        ...(messageId !== undefined ? { messageId } : {}),
        ...(sourceLanguageLabel !== undefined ? { sourceLanguageLabel } : {}),
      });
      saved = await doc.save();
    } catch (err) {
      if (err.code === 11000) { requestId = await generateRequestId(CitizenRequest); continue; }
      throw err;
    }
  }

  if (!saved) {
    const err = new Error('Unable to generate a unique request ID');
    err.statusCode = 500;
    throw err;
  }

  return saved;
};

const createRequest = async (req, res, next) => {
  try {
    const { originalText, source, language, country } = req.body;
    const saved = await createCitizenRequestCore({ originalText, source, language, country });

    res.status(201).json({
      success: true,
      data: {
        requestId: saved.requestId, originalText: saved.originalText, source: saved.source,
        language: saved.language, status: 'received', timestamp: saved.timestamp,
      },
    });
  } catch (err) {
    if (err.statusCode) return res.status(err.statusCode).json({ success: false, message: err.message });
    next(err);
  }
};

/**
 * Step 14 (Issue 1 fix): AI output is always stored in full under
 * `aiUnderstanding`. Top-level category/urgency/location/locationConfidence
 * are ONLY overwritten when the request has no citizenProvided selection
 * (i.e. it came from the free-text /api/requests path) — this preserves
 * the exact existing behavior for that path. For structured submissions
 * (citizenProvided populated), the citizen's own values remain authoritative
 * on the top-level fields; only translatedText/subCategory/problem are
 * still enriched from AI, since those are enrichments, not selections the
 * citizen explicitly made.
 */
const analyzeRequest = async (req, res, next) => {
  try {
    const CitizenRequest = mongoose.model('CitizenRequest');
    const { requestId } = req.body;

    if (!requestId || typeof requestId !== 'string') {
      return res.status(400).json({ success: false, message: 'requestId is required' });
    }

    const request = await CitizenRequest.findOne({ requestId });
    if (!request) {
      return res.status(404).json({ success: false, message: `Request "${requestId}" not found` });
    }

    let analysis;
    try {
      analysis = await analyzeCitizenRequest(request.originalText);
    } catch (err) {
      console.error('AI analysis error:', err);
      return res.status(502).json({ success: false, message: 'Unable to analyze the request at this time.' });
    }

    const hasCitizenSelection = Boolean(request.citizenProvided && request.citizenProvided.category);

    // Always store the AI's own full read, regardless of authority rules below.
    request.aiUnderstanding = {
      language: analysis.language,
      translatedText: analysis.translatedText,
      category: analysis.category,
      subCategory: analysis.subCategory,
      problem: analysis.problem,
      location: { ...analysis.location },
      locationConfidence: analysis.locationConfidence,
      urgency: analysis.urgency,
      confidence: analysis.confidence,
      analyzedAt: new Date(),
    };

    // Enrichment fields — safe to update regardless of submission path.
    request.translatedText = analysis.translatedText;
    request.subCategory = analysis.subCategory;
    request.problem = analysis.problem;

    if (!hasCitizenSelection) {
      // Free-text path — unchanged behavior from Step 6/9/13.
      request.language = analysis.language;
      request.category = analysis.category;
      request.location = { ...analysis.location };
      request.locationConfidence = analysis.locationConfidence;
      request.urgency = analysis.urgency;
      request.confidence = analysis.confidence;
    }
    // else: structured path — top-level category/urgency/location/
    // locationConfidence/confidence stay exactly as the citizen set them.

    await request.save();

    res.status(200).json({
      success: true,
      data: { requestId: request.requestId, analysis, citizenSelectionPreserved: hasCitizenSelection },
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { getRequests, createRequest, analyzeRequest, createCitizenRequestCore };