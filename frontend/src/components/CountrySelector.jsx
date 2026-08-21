import { useEffect, useState } from 'react';
import { fetchCountries } from '../services/api';
import { useCountry } from '../context/CountryContext';

const FALLBACK_COUNTRIES = [
  { code: 'IN', displayName: 'India' },
  { code: 'BR', displayName: 'Brazil' },
  { code: 'RU', displayName: 'Russia' },
  { code: 'CN', displayName: 'China' },
  { code: 'ZA', displayName: 'South Africa' },
];

const CountrySelector = () => {
  const { country, setCountry } = useCountry();
  const [countries, setCountries] = useState(FALLBACK_COUNTRIES);

  useEffect(() => {
    let cancelled = false;
    fetchCountries()
      .then((res) => { if (!cancelled && res.countries) setCountries(res.countries); })
      .catch(() => {}); // fallback list already covers the UI if this fails
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="form-field" style={{ maxWidth: 260, marginBottom: 'var(--space-4)' }}>
      <label className="form-label" htmlFor="country-selector">Country</label>
      <select id="country-selector" value={country} onChange={(e) => setCountry(e.target.value)}>
        {countries.map((c) => (
          <option key={c.code} value={c.code}>{c.displayName}</option>
        ))}
      </select>
      {country !== 'IN' && (
        <div className="form-hint">Data for this country is not yet available — showing India by default where applicable.</div>
      )}
    </div>
  );
};

export default CountrySelector;