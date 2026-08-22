import { NavLink, Outlet } from 'react-router-dom';
import BackendStatus from '../components/BackendStatus';

const navItems = [
  { to: '/', label: 'Overview', end: true },
  { to: '/citizen', label: 'Submit a Request' },
  { to: '/dashboard', label: 'Dashboard' },
  { to: '/priorities', label: 'Priorities' },
  { to: '/messaging-simulator', label: 'Messaging Simulator' },
];

const MainLayout = () => {
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