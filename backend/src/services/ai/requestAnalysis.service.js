const { AI_MOCK_MODE } = require('../../config/env');
const { callLLM, LLMProviderError } = require('./llmProvider');
const { mockAnalyzeCitizenRequest } = require('./mockAnalysis.service');
const { validateAnalysis } = require('../../utils/requestValidation');

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
  "language": "en" | "hi" | "bn",
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

// Strips markdown code fences if the model wraps the JSON despite instructions.
const extractJson = (rawText) => {
  const cleaned = rawText.trim().replace(/^```json/i, '').replace(/^```/, '').replace(/```$/, '').trim();
  return JSON.parse(cleaned);
};

const callLLMOnce = async (text) => {
  const rawText = await callLLM(SYSTEM_PROMPT, text);
  try {
    return extractJson(rawText);
  } catch (err) {
    throw new LLMProviderError('AI response was not valid JSON', { retryable: false, cause: err });
  }
};

/**
 * Main entry point (Step 6, Section 3). Real-mode responses ALWAYS pass
 * through validateAnalysis before being returned — never trusted blindly.
 * At most ONE retry, and only for transient/retryable provider failures.
 */
const analyzeCitizenRequest = async (text) => {
  if (!text || typeof text !== 'string' || text.trim().length === 0) {
    throw new Error('Text is required for analysis');
  }

  if (AI_MOCK_MODE) {
    const mockResult = mockAnalyzeCitizenRequest(text);
    const validation = validateAnalysis(mockResult);
    if (!validation.valid) {
      throw new Error(`Mock analysis failed internal validation: ${validation.errors.join('; ')}`);
    }
    return validation.data;
  }

  let lastError;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const raw = await callLLMOnce(text);
      const validation = validateAnalysis(raw);
      if (!validation.valid) {
        throw new LLMProviderError(`AI response failed validation: ${validation.errors.join('; ')}`, { retryable: false });
      }
      return validation.data;
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