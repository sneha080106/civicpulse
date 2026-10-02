// Location helpers shared by the AI analysis layer and the priority engine.
//
// Everything here is deterministic and EXACT-match based (after casing /
// whitespace / diacritic normalization). There is deliberately no fuzzy or
// "closest district" matching: a location either resolves to exactly one
// supported region, or it stays unknown.

// Key used to compare stored country / district values. Only differences in
// casing and whitespace are ignored — "Ranchi", "ranchi" and " Ranchi  " are
// the same location; "Ranchi" and "Rachi" are not.
const normalizeLocationKey = (value) =>
  typeof value === 'string' ? value.trim().replace(/\s+/g, ' ').toLowerCase() : '';

// Looser form used ONLY when searching free text for a region name:
// additionally strips diacritics ("São Paulo" -> "sao paulo").
const foldForSearch = (value) =>
  typeof value === 'string'
    ? value.normalize('NFD').replace(/\p{M}+/gu, '').toLowerCase().replace(/\s+/g, ' ').trim()
    : '';

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// Whole-word phrase match ("Gaya" matches "in Gaya." but not "Gayatri").
const containsPhrase = (foldedText, foldedPhrase) => {
  if (!foldedPhrase) return false;
  const pattern = new RegExp(`(?<![\\p{L}\\p{N}])${escapeRegExp(foldedPhrase)}(?![\\p{L}\\p{N}])`, 'u');
  return pattern.test(foldedText);
};

/**
 * Looks for exactly ONE supported district named in `text`.
 * regions: [{ regionId, country, state, district }]
 * Returns { region, stateMentioned, ambiguous }.
 *  - no district named            -> region: null
 *  - two or more districts named  -> region: null, ambiguous: true (never guess)
 */
const findRegionInText = (text, regions) => {
  const none = { region: null, stateMentioned: false, ambiguous: false };
  if (!Array.isArray(regions) || regions.length === 0) return none;

  const folded = foldForSearch(text);
  const matched = regions.filter((r) => containsPhrase(folded, foldForSearch(r.district)));
  if (matched.length === 0) return none;
  if (matched.length > 1) return { region: null, stateMentioned: false, ambiguous: true };

  const region = matched[0];
  const foldedState = foldForSearch(region.state);
  const stateMentioned = Boolean(foldedState) &&
    foldedState !== foldForSearch(region.district) &&
    containsPhrase(folded, foldedState);
  return { region, stateMentioned, ambiguous: false };
};

/**
 * Validates an extracted { country, state, district } against the supported
 * regions. The district is the only field that has to resolve:
 *  - exactly one supported region has that district (case/whitespace-insensitive)
 *    -> the location is replaced by that region's canonical country/state/district
 *  - no match, or ambiguous between countries -> district becomes null (never kept
 *    as an unsupported value); country/state are passed through untouched
 * When `regions` is empty there is nothing to validate against, so the location
 * is returned unchanged (same behaviour as before region context existed).
 *
 * Returns { location, resolved, dropped }.
 */
const resolveSupportedLocation = (location, regions, countryHint = null) => {
  const loc = {
    country: (location && location.country) || null,
    state: (location && location.state) || null,
    district: (location && location.district) || null,
  };

  if (!Array.isArray(regions) || regions.length === 0) {
    return { location: loc, resolved: false, dropped: false };
  }
  if (!loc.district) return { location: loc, resolved: false, dropped: false };

  const narrowByCountry = (candidates, country) => {
    const key = normalizeLocationKey(country);
    if (!key) return candidates;
    const narrowed = candidates.filter((r) => normalizeLocationKey(r.country) === key);
    return narrowed.length > 0 ? narrowed : candidates;
  };

  const districtKey = normalizeLocationKey(loc.district);
  let candidates = regions.filter((r) => normalizeLocationKey(r.district) === districtKey);
  if (candidates.length > 1) candidates = narrowByCountry(candidates, loc.country);
  if (candidates.length > 1) candidates = narrowByCountry(candidates, countryHint);

  if (candidates.length === 1) {
    const region = candidates[0];
    return {
      location: { country: region.country, state: region.state || null, district: region.district },
      resolved: true,
      dropped: false,
    };
  }

  return { location: { ...loc, district: null }, resolved: false, dropped: true };
};

module.exports = { normalizeLocationKey, foldForSearch, findRegionInText, resolveSupportedLocation };
