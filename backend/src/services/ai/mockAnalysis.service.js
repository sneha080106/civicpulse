// DEVELOPMENT-ONLY deterministic mock. Gated by AI_MOCK_MODE in
// requestAnalysis.service.js — never used when AI_MOCK_MODE=false.
// Uses simple script-range + keyword detection, no external calls.

const detectLanguage = (text) => {
  // Excludes U+0964/U+0965 (danda / double danda) — these punctuation marks
  // are shared across Devanagari, Bengali, and other Indic scripts, so they
  // don't reliably indicate Hindi on their own and were causing Bengali
  // sentences (which also end in "।") to be misdetected as Hindi.
  const hasDevanagariLetters = /[\u0900-\u0963\u0966-\u097F]/.test(text);
  const hasBengaliLetters = /[\u0980-\u09FF]/.test(text);
  if (/[\u0C00-\u0C7F]/.test(text)) return 'te'; // Telugu
  if (/[\u0B80-\u0BFF]/.test(text)) return 'ta'; // Tamil
  if (/[\u0A80-\u0AFF]/.test(text)) return 'gu'; // Gujarati
  if (/[\u0C80-\u0CFF]/.test(text)) return 'kn'; // Kannada
  if (/[\u0D00-\u0D7F]/.test(text)) return 'ml'; // Malayalam
  if (/[\u0A00-\u0A7F]/.test(text)) return 'pa'; // Punjabi (Gurmukhi)
  if (/[\u0B00-\u0B7F]/.test(text)) return 'or'; // Odia
  if (/[\u0600-\u06FF]/.test(text)) return 'ur';

  if (hasBengaliLetters) return 'bn';
  if (hasDevanagariLetters) return 'hi';
  return 'en';
};

const KEYWORD_CATEGORY_MAP = [
  { category: 'Healthcare', keywords: ['hospital', 'doctor', 'medicine', 'clinic', 'अस्पताल', 'डॉक्टर', 'दवा', 'হাসপাতাল', 'ডাক্তার'] },
  { category: 'Water & Sanitation', keywords: ['water', 'drinking water', 'पानी', 'जल', 'জল', 'পানি'] },
  { category: 'Roads & Transport', keywords: ['road', 'pothole', 'highway', 'सड़क', 'रास्ता', 'রাস্তা'] },
  { category: 'Electricity', keywords: ['electricity', 'power', 'बिजली', 'বিদ্যুৎ'] },
  { category: 'Education', keywords: ['school', 'teacher', 'स्कूल', 'शिक्षक', 'স্কুল'] },
  { category: 'Internet & Digital Connectivity', keywords: ['internet', 'network', 'wifi', 'इंटरनेट', 'ইন্টারনেট'] },
];

const detectCategory = (text) => {
  const lower = text.toLowerCase();
  for (const entry of KEYWORD_CATEGORY_MAP) {
    if (entry.keywords.some((kw) => lower.includes(kw.toLowerCase()))) {
      return entry.category;
    }
  }
  return 'Other';
};

const URGENCY_KEYWORDS = {
  HIGH: ['emergency', 'ambulance', 'urgent', 'severe', 'no doctor', 'बहुत दूर', 'गंभीर', 'জরুরি'],
  LOW: ['minor', 'could be better', 'not urgent', 'थोड़ा', 'সামান্য'],
};

const detectUrgency = (text) => {
  const lower = text.toLowerCase();
  if (URGENCY_KEYWORDS.HIGH.some((kw) => lower.includes(kw.toLowerCase()))) return 'HIGH';
  if (URGENCY_KEYWORDS.LOW.some((kw) => lower.includes(kw.toLowerCase()))) return 'LOW';
  return 'MEDIUM';
};

/**
 * Mock mode NEVER fabricates location — it always returns null location
 * fields with LOW confidence, matching the real extraction rule exactly.
 */
const mockAnalyzeCitizenRequest = (text) => ({
  language: detectLanguage(text),
  translatedText: detectLanguage(text) === 'en' ? text : `[MOCK TRANSLATION] ${text}`,
  category: detectCategory(text),
  subCategory: null,
  problem: text.length > 120 ? `${text.slice(0, 120)}...` : text,
  location: { country: null, state: null, district: null },
  locationConfidence: 'LOW',
  urgency: detectUrgency(text),
  confidence: 0.5,
});

module.exports = { mockAnalyzeCitizenRequest };