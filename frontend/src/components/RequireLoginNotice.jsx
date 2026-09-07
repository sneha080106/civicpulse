import { Link, useLocation } from 'react-router-dom';

// Used to gate citizen-submission forms without hiding the whole page —
// Dashboard/Priorities stay publicly viewable, but the submission action
// itself requires a citizen (or admin) login.
const RequireLoginNotice = ({ message = 'You need to log in to submit a request.' }) => {
  const location = useLocation();
  return (
    <div className="surface-card section-block" style={{ maxWidth: 480 }}>
      <p>{message}</p>
      <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
        <Link className="btn btn-primary" to="/login" state={{ from: location.pathname }}>
          Log In
        </Link>
        <Link className="btn btn-secondary" to="/register">
          Create an Account
        </Link>
      </div>
    </div>
  );
};

export default RequireLoginNotice;
