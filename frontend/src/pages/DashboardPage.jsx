import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import KpiCard from '../components/KpiCard';
import EmptyState from '../components/EmptyState';
import LoadingState from '../components/LoadingState';
import HotspotMap from '../components/HotspotMap';
import CitizenRequestForm from '../components/CitizenRequestForm';
import { fetchOverview, fetchPriorities } from '../services/api';

const DashboardPage = () => {
  const [overview, setOverview] = useState(null);
  const [topPriorities, setTopPriorities] = useState([]);
  const [status, setStatus] = useState('loading');
  const [refreshKey, setRefreshKey] = useState(0); // bumped after a citizen submission
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setStatus((prev) => (prev === 'success' ? 'success' : 'loading')); // avoid flicker on refresh
      try {
        const [overviewRes, prioritiesRes] = await Promise.all([
          fetchOverview(),
          fetchPriorities({ limit: 5 }),
        ]);
        if (!cancelled) {
          setOverview(overviewRes.data);
          setTopPriorities(prioritiesRes.priorities || []);
          setStatus('success');
        }
      } catch (err) {
        if (!cancelled) setStatus('error');
      }
    };

    load();
    return () => { cancelled = true; };
  }, [refreshKey]);

  const handleSubmitted = useCallback(() => {
    setRefreshKey((k) => k + 1); // re-runs the effect above, and HotspotMap remounts via its own key below
  }, []);

  const isLoading = status === 'loading';

  return (
    <div>
      <div className="page-header">
        <div className="page-header-eyebrow">Policymaker Dashboard</div>
        <h1>Infrastructure Overview</h1>
        <p>A summary of citizen-reported concerns and deterministic priority analysis.</p>
      </div>

      <div className="badge badge-warning" style={{ display: 'block', width: 'fit-content', marginBottom: '20px' }}>
        Prototype analytics — demographic, infrastructure and investment values shown here are synthetic demonstration data.
      </div>

      <div className="surface-card section-block">
        <h2>Submit a Citizen Request</h2>
        <p>Structured submission — select the sector and urgency directly. This is separate from the free-text AI intake at <code>/citizen</code>.</p>
        <CitizenRequestForm onSubmitted={handleSubmitted} />
      </div>

      {status === 'error' ? (
        <EmptyState title="Unable to load dashboard data" description="The backend may be offline, or priority analysis has not yet been run." />
      ) : (
        <>
          <div className="kpi-grid">
            <KpiCard label="Total Requests" value={overview?.totalRequests} isLoading={isLoading} />
            <KpiCard label="Regions Analyzed" value={overview?.regionsAnalyzed} isLoading={isLoading} />
            <KpiCard label="Top Concern" value={overview?.topConcern} isLoading={isLoading} isPlaceholder={!isLoading && !overview?.topConcern} />
            <KpiCard label="Highest Priority" value={overview?.highestPriorityRegion} isLoading={isLoading} isPlaceholder={!isLoading && !overview?.highestPriorityRegion} />
          </div>

          <h2>Geographic Priority Hotspots</h2>
          <HotspotMap key={refreshKey} />

          <h2 style={{ marginTop: '32px' }}>Priority Ranking</h2>

          {isLoading && <LoadingState label="Loading priority ranking..." />}

          {status === 'success' && topPriorities.length === 0 && (
            <EmptyState title="No priority results yet" description="Run POST /api/analytics/calculate on the backend to generate results." />
          )}

          {status === 'success' && topPriorities.length > 0 && (
            <div className="surface-card" style={{ overflow: 'hidden' }}>
              <table className="data-table">
                <thead>
                  <tr><th>Rank</th><th>District</th><th>Sector</th><th>Score</th><th>Affected Population</th></tr>
                </thead>
                <tbody>
                  {topPriorities.map((p) => (
                    <tr key={p.priorityId} onClick={() => navigate(`/priorities/${p.priorityId}`)} style={{ cursor: 'pointer' }}>
                      <td><span className="rank-badge">{p.rank}</span></td>
                      <td>{p.district}</td>
                      <td>{p.sector}</td>
                      <td>{p.priorityScore}</td>
                      <td>{p.affectedPopulation?.toLocaleString?.() ?? p.affectedPopulation}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default DashboardPage;