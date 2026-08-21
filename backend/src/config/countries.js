// Centralized BRICS country configuration. Purely additive — nothing
// existing reads from this file yet unless explicitly wired in below.
// India stays the default and remains the only country with real seed
// data; selecting another country only establishes context for now.

const COUNTRIES = [
  { code: 'IN', name: 'India', displayName: 'India', languages: ['en', 'hi', 'bn'] },
  { code: 'BR', name: 'Brazil', displayName: 'Brazil', languages: ['pt'] },
  { code: 'RU', name: 'Russia', displayName: 'Russia', languages: ['ru'] },
  { code: 'CN', name: 'China', displayName: 'China', languages: ['zh'] },
  { code: 'ZA', name: 'South Africa', displayName: 'South Africa', languages: ['en'] },
];

const DEFAULT_COUNTRY_CODE = 'IN';

const getCountryByCode = (code) => COUNTRIES.find((c) => c.code === code) || null;

// Resolves a country code to the full name already used throughout the
// data model (Demographic.country, CitizenRequest.location.country store
// full names like "India", not codes) — keeps that existing convention.
const resolveCountryName = (code) => {
  const country = getCountryByCode(code);
  return country ? country.name : getCountryByCode(DEFAULT_COUNTRY_CODE).name;
};

module.exports = { COUNTRIES, DEFAULT_COUNTRY_CODE, getCountryByCode, resolveCountryName };