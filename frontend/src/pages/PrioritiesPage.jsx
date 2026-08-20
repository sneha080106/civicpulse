import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import EmptyState from '../components/EmptyState';
import LoadingState from '../components/LoadingState';
import { fetchPriorities } from '../services/api';

const PrioritiesPage = () => {
  const [priorities, setPriorities] = useState([]);
  const [status, setStatus] = useState('loading');
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const response = await fetchPriorities({ limit: 20 });
        if (!cancelled) {
          setPriorities(response.priorities || []);
          setStatus('success');
        }
      } catch (err) {
        if (!cancelled) setStatus('error');
      }
    };
    load();
    return () => { cancelled = true; };
  }, []);

  return (
    <div>
      <div className="page-header">
        <div className="page-header-eyebrow">Deterministic Ranking</div>
        <h1>Regional Priorities</h1>
        <p>Ranked by a transparent, formula-based priority score. Prototype analytics — synthetic demonstration data.</p>
      </div>

      {status === 'loading' && <LoadingState label="Loading priorities..." />}
      {status === 'error' && <EmptyState title="Unable to load priorities" description="The backend may be offline, or priority results have not yet been generated." />}
      {status === 'success' && priorities.length === 0 && (
        <EmptyState title="No priority results yet" description="Run POST /api/analytics/calculate on the backend to populate this list." />
      )}

      {status === 'success' && priorities.length > 0 && (
        <div className="surface-card" style={{ overflow: 'hidden' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Rank</th><th>District</th><th>Sector</th><th>Score</th>
                <th>Demand</th><th>Infra Gap</th><th>Affected Pop.</th><th>Urgency</th><th>Investment Gap</th>
              </tr>
            </thead>
            <tbody>
              {priorities.map((p) => (
                <tr key={p.priorityId} onClick={() => navigate(`/priorities/${p.priorityId}`)} style={{ cursor: 'pointer' }}>
                  <td><span className="rank-badge">{p.rank}</span></td>
                  <td>{p.district}</td>
                  <td>{p.sector}</td>
                  <td>{p.priorityScore}</td>
                  <td>{p.demandScore}</td>
                  <td>{p.infrastructureGap}</td>
                  <td>{p.affectedPopulation?.toLocaleString?.() ?? p.affectedPopulation}</td>
                  <td>{p.urgencyScore}</td>
                  <td>{p.investmentGap}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default PrioritiesPage;