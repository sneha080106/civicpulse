// Thin wrapper around the LLM provider's raw HTTP API. Isolated here so
// requestAnalysis.service.js doesn't deal with provider-specific request/
// response shapes. Uses Node's built-in fetch — no new dependency added.

const { LLM_API_KEY, LLM_MODEL } = require('../../config/env');

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1/messages';
const REQUEST_TIMEOUT_MS = 15000;

class LLMProviderError extends Error {
  constructor(message, { retryable = false, cause } = {}) {
    super(message);
    this.name = 'LLMProviderError';
    this.retryable = retryable;
    this.cause = cause;
  }
}

const callLLM = async (systemPrompt, userMessage) => {
  if (!LLM_API_KEY) throw new LLMProviderError('Missing LLM_API_KEY', { retryable: false });
  if (!LLM_MODEL) throw new LLMProviderError('Missing LLM_MODEL', { retryable: false });

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(ANTHROPIC_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': LLM_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: LLM_MODEL,
        max_tokens: 500,
        system: systemPrompt,
        messages: [{ role: 'user', content: userMessage }],
      }),
      signal: controller.signal,
    });

    // 429 (rate limit) and 5xx are treated as transient/retryable.
    if (response.status === 429 || response.status >= 500) {
      throw new LLMProviderError(`Provider returned status ${response.status}`, { retryable: true });
    }
    if (!response.ok) {
      throw new LLMProviderError(`Provider returned status ${response.status}`, { retryable: false });
    }

    const data = await response.json();
    const textBlock = Array.isArray(data.content) ? data.content.find((b) => b.type === 'text') : null;

    if (!textBlock || typeof textBlock.text !== 'string') {
      throw new LLMProviderError('Provider response missing text content', { retryable: false });
    }

    return textBlock.text;
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new LLMProviderError('Provider request timed out', { retryable: true, cause: err });
    }
    if (err instanceof LLMProviderError) throw err;
    throw new LLMProviderError('Provider request failed', { retryable: true, cause: err });
  } finally {
    clearTimeout(timeout);
  }
};

module.exports = { callLLM, LLMProviderError };