import { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { isStaffRole } from '../utils/roles';

const LoginPage = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const cameFrom = location.state?.from;

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setIsSubmitting(true);
    try {
      const loggedIn = await login(email.trim(), password);
      // Go back to where they were headed; otherwise staff land on the
      // control panel and citizens on the submission form.
      navigate(cameFrom || (isStaffRole(loggedIn.role) ? '/admin' : '/citizen'), { replace: true });
    } catch (err) {
      setError(err?.response?.data?.message || 'Could not log in. Please check your credentials.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <div className="page-header-eyebrow">Account</div>
        <h1>Log In</h1>
        <p>Log in to submit an infrastructure request, or to access the staff control panel.</p>
      </div>

      <div className="surface-card section-block" style={{ maxWidth: 420 }}>
        <form onSubmit={handleSubmit}>
          <div className="form-field">
            <label className="form-label" htmlFor="login-email">Email</label>
            <input
              id="login-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>
          <div className="form-field">
            <label className="form-label" htmlFor="login-password">Password</label>
            <input
              id="login-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>
          <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
            {isSubmitting ? 'Logging in...' : 'Log In'}
          </button>
        </form>

        {error && (
          <div className="badge badge-danger" style={{ marginTop: '16px', display: 'block', width: 'fit-content' }}>
            {error}
          </div>
        )}

        <div className="form-hint" style={{ marginTop: '16px' }}>
          Don&apos;t have an account? <Link to="/register">Register here</Link>.
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
