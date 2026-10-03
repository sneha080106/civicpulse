// Builds the request bodies the two citizen submission forms send to the
// backend. Kept as small pure functions so the exact payloads are testable.

// Languages the structured form offers (matches what POST /citizen-requests accepts).
export const STRUCTURED_LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'hi', label: 'Hindi' },
  { code: 'bn', label: 'Bengali' },
];

// POST /citizen-requests — the structured Dashboard form.
// `country` is the code chosen in the country selector (e.g. 'IN', 'BR'); the
// backend resolves it to the stored country name.
export const buildStructuredPayload = (form, country) => ({
  state: form.state.trim(),
  district: form.district.trim(),
  category: form.category,
  description: form.description.trim(),
  urgency: form.urgency,
  affectedPopulationEstimate: form.affectedPopulationEstimate ? Number(form.affectedPopulationEstimate) : undefined,
  language: form.language,
  country,
});

// POST /requests — the free-text /citizen page.
// voiceLanguage is null for typed input. When the text came from voice
// dictation it holds the language code the dictation used: the request is then
// sent as source 'voice' together with that language. Typed requests keep the
// original payload (source from the source selector, no language).
export const buildFreeTextPayload = ({ text, source, country, voiceLanguage }) => (
  voiceLanguage
    ? { originalText: text.trim(), source: 'voice', language: voiceLanguage, country }
    : { originalText: text.trim(), source, country }
);
