const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 100;

// Coerces a query-string limit into a safe positive integer, capped at MAX_LIMIT.
const parseLimit = (rawLimit, { defaultLimit = DEFAULT_LIMIT, maxLimit = MAX_LIMIT } = {}) => {
  const parsed = parseInt(rawLimit, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return defaultLimit;
  return Math.min(parsed, maxLimit);
};

// Only accepts plain strings for equality filters. Rejects anything that
// isn't a string (e.g. ?district[$ne]=1 parses as an object in Express)
// and anything that looks like a Mongo operator, to prevent filter injection.
const sanitizeFilterValue = (value) => {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  if (trimmed.length === 0) return undefined;
  if (trimmed.startsWith('$') || trimmed.includes('{') || trimmed.includes('}')) return undefined;
  return trimmed;
};

module.exports = { parseLimit, sanitizeFilterValue, DEFAULT_LIMIT, MAX_LIMIT };