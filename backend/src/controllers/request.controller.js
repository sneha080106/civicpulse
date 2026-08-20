const mongoose = require('mongoose');
const { sanitizeFilterValue } = require('../utils/query');
const { analyzeCitizenRequest } = require('../services/ai/requestAnalysis.service');
const { generateRequestId } = require('../utils/requestId');

const getRequests = async (req, res, next) => {
  try {
    const CitizenRequest = mongoose.model('CitizenRequest');
    const filter = {};
    const district = sanitizeFilterValue(req.query.district);
    const category = sanitizeFilterValue(req.query.category);
    const language = sanitizeFilterValue(req.query.language);
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

const createRequest = async (req, res, next) => {
  try {
    const CitizenRequest = mongoose.model('CitizenRequest');
    const { originalText, source, language } = req.body;

    if (!originalText || typeof originalText !== 'string' || originalText.trim().length === 0) {
      return res.status(400).json({ success: false, message: 'originalText is required' });
    }

    let finalSource = 'text';
    if (source !== undefined && source !== null) {
      if (!ALLOWED_SOURCES.includes(source)) {
        return res.status(400).json({ success: false, message: `Invalid source "${source}". Must be one of: ${ALLOWED_SOURCES.join(', ')}` });
      }
      finalSource = source;
    }

    let finalLanguage = 'en';
    if (language !== undefined && language !== null) {
      if (!ALLOWED_LANGUAGES.includes(language)) {
        return res.status(400).json({ success: false, message: `Invalid language "${language}". Must be one of: ${ALLOWED_LANGUAGES.join(', ')}` });
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
          category: 'Other', // placeholder until /analyze runs — free-text path, no citizenProvided
          source: finalSource,
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
      data: { requestId: saved.requestId, originalText: saved.originalText, source: saved.source, language: saved.language, status: 'received', timestamp: saved.timestamp },
    });
  } catch (err) {
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

module.exports = { getRequests, createRequest, analyzeRequest };