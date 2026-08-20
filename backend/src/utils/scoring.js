const clamp = (value, min, max) => {
  if (typeof value !== 'number' || Number.isNaN(value)) return min;
  return Math.min(max, Math.max(min, value));
};

const round2 = (value) => {
  if (typeof value !== 'number' || Number.isNaN(value)) return 0;
  return Math.round(value * 100) / 100;
};

// Divides safely: returns `fallback` instead of NaN/Infinity on bad input.
const safeDivide = (numerator, denominator, fallback = 0) => {
  if (!denominator || Number.isNaN(denominator)) return fallback;
  const result = numerator / denominator;
  return Number.isFinite(result) ? result : fallback;
};

// Normalizes `value` against `maxValue` into a 0-100 score.
const normalizeToScore = (value, maxValue) => {
  if (!maxValue || maxValue <= 0 || Number.isNaN(maxValue)) return 0;
  if (!value || Number.isNaN(value) || value < 0) return 0;
  return clamp((value / maxValue) * 100, 0, 100);
};

module.exports = { clamp, round2, safeDivide, normalizeToScore };