import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// Public self-registration always creates a citizen account. Admin accounts
// are provisioned separately by the team (see backend seed:admin script) —
// there is no role selector here on purpose.
const RegisterPage = () => {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');

    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    setIsSubmitting(true);
    try {
      await register(name.trim(), email.trim(), password);
      navigate('/citizen', { replace: true });
    } catch (err) {
      setError(err?.response?.data?.message || 'Could not create your account. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div className="page-header-eyebrow">Account</div>
        <h1>Create a Citizen Account</h1>
        <p>Register to submit infrastructure requests to CivicPulse.</p>
      </div>

      <div className="surface-card section-block" style={{ maxWidth: 420 }}>
        <form onSubmit={handleSubmit}>
          <div className="form-field">
            <label className="form-label" htmlFor="register-name">Name</label>
            <input
              id="register-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
            />
          </div>
          <div className="form-field">
            <label className="form-label" htmlFor="register-email">Email</label>
            <input
              id="register-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>
          <div className="form-field">
            <label className="form-label" htmlFor="register-password">Password</label>
            <input
              id="register-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="new-password"
            />
            <div className="form-hint">At least 8 characters.</div>
          </div>
          <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
            {isSubmitting ? 'Creating account...' : 'Register'}
          </button>
        </form>

        {error && (
          <div className="badge badge-danger" style={{ marginTop: '16px', display: 'block', width: 'fit-content' }}>
            {error}
          </div>
        )}

        <div className="form-hint" style={{ marginTop: '16px' }}>
          Already have an account? <Link to="/login">Log in here</Link>.
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
