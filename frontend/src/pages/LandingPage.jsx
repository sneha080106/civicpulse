import { useNavigate } from 'react-router-dom';

const LandingPage = () => {
  const navigate = useNavigate();

  return (
    <section className="landing-hero">
      <div className="landing-eyebrow">Civic Infrastructure Intelligence</div>
      <h1 className="landing-title">CivicPulse</h1>
      <p className="landing-subtitle">
        An AI-powered Citizen-to-Infrastructure Intelligence Platform. CivicPulse connects citizen-reported
        infrastructure concerns with demographic, infrastructure, and investment data to surface where public
        attention is most needed — using a transparent, deterministic prioritization method.
      </p>

      <div style={{ display: 'flex', gap: '12px' }}>
        <button className="btn btn-primary" onClick={() => navigate('/dashboard')}>
          Explore Civic Intelligence
        </button>
        <button className="btn btn-secondary" onClick={() => navigate('/citizen')}>
          Submit a Citizen Request
        </button>
      </div>
    </section>
  );
};

export default LandingPage;