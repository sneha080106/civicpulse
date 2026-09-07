import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import BackendStatus from '../components/BackendStatus';
import { useAuth } from '../context/AuthContext';

const navItems = [
  { to: '/', label: 'Overview', end: true },
  { to: '/citizen', label: 'Submit a Request' },
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/priorities', label: 'Priorities' },
  { to: '/messaging-simulator', label: 'Messaging Simulator' },
];

const MainLayout = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <span className="sidebar-brand-mark">CivicPulse</span>
          <span className="sidebar-brand-sub">Infrastructure Intelligence</span>
        </div>

        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
            >
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          {isAuthenticated ? (
            <div className="form-hint" style={{ marginBottom: '8px' }}>
              Logged in as {user?.email} ({user?.role})
              <button
                type="button"
                className="btn btn-secondary"
                style={{ display: 'block', marginTop: '8px', width: '100%' }}
                onClick={handleLogout}
              >
                Log Out
              </button>
            </div>
          ) : (
            <NavLink to="/login" className="sidebar-link">
              Log In
            </NavLink>
          )}
          <BackendStatus />
        </div>
      </aside>

      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
};

export default MainLayout;