const { clamp, round2 } = require('../utils/scoring');

const SECTOR_INDEX_MAP = {
  'Roads & Transport': 'roadConnectivityIndex',
  Healthcare: 'healthcareAccessIndex',
  Education: 'educationAccessIndex',
  'Water & Sanitation': 'waterAccessIndex',
  Electricity: 'electricityAccessIndex',
  'Internet & Digital Connectivity': 'internetAccessIndex',
};

const isSectorSupported = (sector) =>
  Object.prototype.hasOwnProperty.call(SECTOR_INDEX_MAP, sector);

// Returns the raw 0-100 index for a sector, or null if unsupported/missing.
const getInfrastructureIndex = (sector, infrastructureDoc) => {
  if (!isSectorSupported(sector)) return null;
  if (!infrastructureDoc) return null;
  const field = SECTOR_INDEX_MAP[sector];
  const value = infrastructureDoc[field];
  if (typeof value !== 'number' || Number.isNaN(value)) return null;
  return clamp(value, 0, 100);
};

// Returns 100 - index, or null if the sector/data is unsupported.
// Callers MUST handle null explicitly — never silently treat as 0.
const getInfrastructureGap = (sector, infrastructureDoc) => {
  const index = getInfrastructureIndex(sector, infrastructureDoc);
  if (index === null) return null;
  return round2(100 - index);
};

module.exports = {
  SECTOR_INDEX_MAP,
  isSectorSupported,
  getInfrastructureIndex,
  getInfrastructureGap,
};