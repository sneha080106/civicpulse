const LANGUAGES = [
  { code: 'en', label: 'English' }, { code: 'hi', label: 'Hindi' }, { code: 'bn', label: 'Bengali' },
  { code: 'te', label: 'Telugu' }, { code: 'mr', label: 'Marathi' }, { code: 'ta', label: 'Tamil' },
  { code: 'gu', label: 'Gujarati' }, { code: 'kn', label: 'Kannada' }, { code: 'ml', label: 'Malayalam' },
  { code: 'pa', label: 'Punjabi' }, { code: 'or', label: 'Odia' }, { code: 'as', label: 'Assamese' },
  { code: 'ur', label: 'Urdu' },
];

const LanguageSelector = ({ value, onChange, disabled }) => (
  <div className="form-field" style={{ maxWidth: 220 }}>
    <label className="form-label" htmlFor="language-selector">Language</label>
    <select id="language-selector" value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled}>
      {LANGUAGES.map((l) => <option key={l.code} value={l.code}>{l.label}</option>)}
    </select>
  </div>
);

export default LanguageSelector;