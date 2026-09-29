import { Navigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import LoadingState from './LoadingState';

// Wrap a page to require login and (optionally) specific roles:
//   <ProtectedRoute roles={STAFF_ROLES}><AdminPage /></ProtectedRoute>
// Not logged in  -> redirected to /login, then sent back here after login.
// Wrong role     -> "Access denied" screen (no redirect loop).
// This is a UX guard only; the API enforces the same rules server-side.
const ProtectedRoute = ({ roles, children }) => {
  const { isAuthenticated, isCheckingSession, user } = useAuth();
  const location = useLocation();

  if (isCheckingSession) return <LoadingState label="Verifying your session..." />;

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (roles && !roles.includes(user?.role)) {
    return (
      <div className="surface-card section-block" style={{ maxWidth: 520 }}>
        <div className="page-header-eyebrow">Error 403</div>
        <h2>Access denied</h2>
        <p>Your account does not have permission to view this page.</p>
        <Link className="btn btn-secondary" to="/" style={{ marginTop: '12px' }}>
          Back to Overview
        </Link>
      </div>
    );
  }

  return children;
};

export default ProtectedRoute;
