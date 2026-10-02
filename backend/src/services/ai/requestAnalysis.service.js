const { AI_MOCK_MODE } = require('../../config/env');
const { callLLM, LLMProviderError } = require('./llmProvider');
const { mockAnalyzeCitizenRequest } = require('./mockAnalysis.service');
const { validateAnalysis } = require('../../utils/requestValidation');
const { resolveSupportedLocation } = require('../../utils/locationMatch');

const SYSTEM_PROMPT = `You are a civic infrastructure request extraction system.

Extract structured information from the citizen's message.

Do not invent information.

If a location is not explicitly available or reliably inferable, return null for that location field.

Do not generate infrastructure statistics.

Do not generate population values.

Do not generate investment values.

Do not generate priority scores.

Respond with ONLY a single JSON object, no other text, no markdown fences, matching exactly this shape:

{
  "language": one of ["en","hi","bn","te","mr","ta","gu","kn","ml","pa","or","as","ur"],
  "translatedText": "string, English normalization of the message",
  "category": one of ["Roads & Transport","Healthcare","Education","Water & Sanitation","Electricity","Internet & Digital Connectivity","Housing","Public Safety","Other"],
  "subCategory": "string or null",
  "problem": "string or null",
  "location": {
    "country": "string or null",
    "state": "string or null",
    "district": "string or null"
  },
  "locationConfidence": "HIGH" | "MEDIUM" | "LOW",
  "urgency": "LOW" | "MEDIUM" | "HIGH",
  "confidence": number between 0 and 1
}`;

/**
 * Builds the "supported regions" block from the region list passed in by the
 * caller (the Demographic collection — see regionRegistry.service.js), grouped
 * country > state > districts. Returns '' when there are no regions, which
 * leaves the prompt exactly as it was before region context existed.
 */
const buildRegionContext = (regions) => {
  if (!Array.isArray(regions) || regions.length === 0) return '';

  const byCountry = new Map();
  regions.forEach((r) => {
    if (!byCountry.has(r.country)) byCountry.set(r.country, new Map());
    const states = byCountry.get(r.country);
    const stateKey = r.state || '(no state)';
    if (!states.has(stateKey)) states.set(stateKey, []);
    states.get(stateKey).push(r.district);
  });

  const lines = [];
  byCountry.forEach((states, country) => {
    lines.push(country);
    states.forEach((districts, state) => lines.push(`  ${state}: ${districts.join(', ')}`));
  });

  return `

SUPPORTED REGIONS (country > state > districts). CivicPulse can only analyze these:

${lines.join('\n')}

Location rules:
- location.district must be EXACTLY one of the district names listed above, spelled as listed, or null.
- When you set a district, set location.country and location.state to the values listed for it.
- Only set a district if the message names it, or names it in another spelling or script, so that it clearly refers to one listed district. Do not infer a district from a state, a landmark, or general context.
- If the message names a place that is not listed, or names no place, return null for location.district. Never choose the closest or most likely district.`;
};

const buildSystemPrompt = (regions) => `${SYSTEM_PROMPT}${buildRegionContext(regions)}`;

// Strips markdown code fences if the model wraps the JSON despite instructions.
const extractJson = (rawText) => {
  const cleaned = rawText.trim().replace(/^```json/i, '').replace(/^```/, '').replace(/```$/, '').trim();
  return JSON.parse(cleaned);
};

const callLLMOnce = async (text, systemPrompt) => {
  const rawText = await callLLM(systemPrompt, text);
  try {
    return extractJson(rawText);
  } catch (err) {
    throw new LLMProviderError('AI response was not valid JSON', { retryable: false, cause: err });
  }
};

/**
 * The AI's location is never trusted on its own: when supported regions are
 * known, the district must resolve to exactly one of them (case/whitespace
 * insensitive). A resolved district gets that region's canonical
 * country/state/district; an unsupported or ambiguous one is dropped to null
 * with LOW location confidence. Scores are not touched — this only decides
 * which region a request is filed under.
 */
const applyRegionResolution = (data, regions, countryHint) => {
  const { location, dropped } = resolveSupportedLocation(data.location, regions, countryHint);
  return { ...data, location, locationConfidence: dropped ? 'LOW' : data.locationConfidence };
};

/**
 * Main entry point (Step 6, Section 3). Real-mode responses ALWAYS pass
 * through validateAnalysis before being returned — never trusted blindly.
 * At most ONE retry, and only for transient/retryable provider failures.
 *
 * options.regions     — supported regions [{ regionId, country, state, district }].
 *                       Optional; omit it and behaviour is unchanged (no location
 *                       context for the AI, no location validation).
 * options.countryHint — the request's already-known country, used only to
 *                       disambiguate a district name shared by two countries.
 */
const analyzeCitizenRequest = async (text, options = {}) => {
  const { regions = [], countryHint = null } = options || {};

  if (!text || typeof text !== 'string' || text.trim().length === 0) {
    throw new Error('Text is required for analysis');
  }

  if (AI_MOCK_MODE) {
    const mockResult = mockAnalyzeCitizenRequest(text, { regions });
    const validation = validateAnalysis(mockResult);
    if (!validation.valid) {
      throw new Error(`Mock analysis failed internal validation: ${validation.errors.join('; ')}`);
    }
    return applyRegionResolution(validation.data, regions, countryHint);
  }

  const systemPrompt = buildSystemPrompt(regions);
  let lastError;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const raw = await callLLMOnce(text, systemPrompt);
      const validation = validateAnalysis(raw);
      if (!validation.valid) {
        throw new LLMProviderError(`AI response failed validation: ${validation.errors.join('; ')}`, { retryable: false });
      }
      return applyRegionResolution(validation.data, regions, countryHint);
    } catch (err) {
      lastError = err;
      const retryable = err instanceof LLMProviderError ? err.retryable : false;
      if (!retryable || attempt === 1) break;
      await new Promise((resolve) => setTimeout(resolve, 500)); // one fixed-delay retry only
    }
  }

  // Full technical detail logged server-side only; callers must return a
  // generic message to the client (never raw provider errors or keys).
  console.error('AI analysis failed:', lastError);
  throw lastError instanceof Error ? lastError : new Error('AI analysis failed');
};

module.exports = { analyzeCitizenRequest };
