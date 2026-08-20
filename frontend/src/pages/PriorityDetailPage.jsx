import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import EmptyState from '../components/EmptyState';
import LoadingState from '../components/LoadingState';
import { fetchPriorityById } from '../services/api';

const PriorityDetailPage = () => {
  const { id } = useParams();
  const [priority, setPriority] = useState(null);
  const [status, setStatus] = useState('loading');

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setStatus('loading');
      try {
        const response = await fetchPriorityById(id);
        if (!cancelled) { setPriority(response.priority); setStatus('success'); }
      } catch (err) {
        if (!cancelled) setStatus(err?.response?.status === 404 ? 'not_found' : 'error');
      }
    };
    load();
    return () => { cancelled = true; };
  }, [id]);

  if (status === 'loading') return <LoadingState label="Loading priority detail..." />;
  if (status === 'not_found') return <EmptyState title="Priority result not found" description={`No priority result exists for "${id}".`} />;
  if (status === 'error' || !priority) return <EmptyState title="Unable to load priority detail" description="The backend may be offline." />;

  const breakdown = priority.scoreBreakdown || {};
  const evidence = priority.evidence || {};

  return (
    <div>
      <div className="page-header">
        <div className="page-header-eyebrow">{priority.sector}</div>
        <h1>{priority.district}</h1>
        <p>Region ID: {priority.regionId}</p>
      </div>

      <div className="badge badge-warning" style={{ display: 'block', width: 'fit-content', marginBottom: '16px' }}>
        Prototype analytics — synthetic demonstration data.
      </div>

      <div className="surface-card section-block">
        <h3>Priority Score</h3>
        <div className="detail-metric-value" style={{ fontSize: '2.5rem' }}>{priority.priorityScore}</div>
      </div>

      <div className="surface-card section-block">
        <h3>Score Breakdown</h3>
        <table className="data-table">
          <tbody>
            <tr><td>Citizen Demand</td><td>+{breakdown.demandContribution}</td></tr>
            <tr><td>Infrastructure Gap</td><td>+{breakdown.infrastructureContribution}</td></tr>
            <tr><td>Population Impact</td><td>+{breakdown.populationContribution}</td></tr>
            <tr><td>Urgency</td><td>+{breakdown.urgencyContribution}</td></tr>
            <tr><td>Investment Gap</td><td>+{breakdown.investmentContribution}</td></tr>
          </tbody>
        </table>
      </div>

      <div className="surface-card section-block">
        <h3>Evidence</h3>
        <table className="data-table">
          <tbody>
            <tr><td>Citizen requests</td><td>{priority.citizenRequestCount ?? 0}</td></tr>
            <tr><td>Demand rate</td><td>{evidence.demandRate ?? 'Not available'} / 1000</td></tr>
            <tr><td>Infrastructure index</td><td>{priority.infrastructureIndex ?? 'Not available'} / 100</td></tr>
            <tr><td>Infrastructure gap</td><td>{priority.infrastructureGap} / 100</td></tr>
            <tr><td>Potentially affected population</td><td>{priority.affectedPopulation?.toLocaleString?.() ?? priority.affectedPopulation}</td></tr>
            <tr><td>Relative investment gap</td><td>{priority.investmentGap} / 100</td></tr>
          </tbody>
        </table>
        <p className="form-hint">"Potentially affected population" is an analytical proxy, not an exact citizen count. "Relative investment gap" reflects investment coverage relative to other analyzed regions, not a required-funding figure.</p>
      </div>

           <div className="surface-card section-block">
        <h3>Recommended Action</h3>
        {priority.recommendation ? (
          <>
            <p>{priority.recommendation}</p>
            {priority.recommendationDrivers && priority.recommendationDrivers.length > 0 && (
              <>
                <div className="detail-metric-label" style={{ marginTop: '12px' }}>Recommendation drivers</div>
                <ul style={{ marginTop: '6px' }}>
                  {priority.recommendationDrivers.map((driver) => (
                    <li key={driver} style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)' }}>
                      {driver.charAt(0).toUpperCase() + driver.slice(1)}
                    </li>
                  ))}
                </ul>
              </>
            )}
          </>
        ) : (
          <div className="badge badge-neutral">Not yet generated</div>
        )}
      </div>

      <Link to="/priorities" className="btn btn-secondary">Back to Priorities</Link>
    </div>
  );
};

export default PriorityDetailPage;