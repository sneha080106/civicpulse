import { useEffect, useState } from 'react';
import { fetchCountrySummary } from '../services/api';
import { useCountry } from '../context/CountryContext';

const CountrySummary = () => {
  const { country } = useCountry();
  const [summary, setSummary] = useState(null);
  const [status, setStatus] = useState('loading');

  useEffect(() => {
    let cancelled = false;
    setStatus('loading');
    fetchCountrySummary(country)
      .then((res) => { if (!cancelled) { setSummary(res.data); setStatus('success'); } })
      .catch(() => { if (!cancelled) setStatus('error'); });
    return () => { cancelled = true; };
  }, [country]);

  if (status === 'loading') return null;
  if (status === 'error' || !summary) return null;

  return (
    <div className="surface-card section-block" style={{ marginBottom: 'var(--space-5)' }}>
      <h3>{summary.country} — Region Data Summary</h3>
      <div className="detail-grid">
        <div>
          <div className="detail-metric-label">Regions Available</div>
          <div className="detail-metric-value">{summary.regionsAvailable}</div>
        </div>
        <div>
          <div className="detail-metric-label">Total Population (seeded regions)</div>
          <div className="detail-metric-value">{summary.totalPopulation?.toLocaleString?.() ?? summary.totalPopulation}</div>
        </div>
        <div>
          <div className="detail-metric-label">Avg. Infrastructure Index</div>
          <div className="detail-metric-value">{summary.avgInfrastructureIndex ?? 'Not available'}</div>
        </div>
        <div>
          <div className="detail-metric-label">Total Investment (existing + planned)</div>
          <div className="detail-metric-value">{summary.totalInvestment ? `₹${summary.totalInvestment.toLocaleString()}` : 'Not available'}</div>
        </div>
      </div>
      {summary.regionsAvailable === 0 && (
        <p className="form-hint" style={{ marginTop: 'var(--space-3)' }}>No region data seeded yet for this country.</p>
      )}
    </div>
  );
};

export default CountrySummary;