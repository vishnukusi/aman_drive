import { Link, NavLink, Navigate, Outlet, useNavigate } from 'react-router-dom';
import { isAdminSession, setAdminSession, resetDemoData } from '../store.js';

const tabs = [
  { to: '/admin', label: 'Overview', end: true },
  { to: '/admin/enquiries', label: 'Enquiries' },
  { to: '/admin/vehicles', label: 'Vehicles' },
  { to: '/admin/roadmap', label: 'Production roadmap' },
];

export default function AdminLayout() {
  const nav = useNavigate();
  if (!isAdminSession()) return <Navigate to="/admin/login" replace />;

  const logout = () => {
    setAdminSession(false);
    nav('/admin/login');
  };
  const reset = () => {
    if (window.confirm('Reset all demo enquiries and vehicles to the starting data? Enquiries you submitted will be removed.')) {
      resetDemoData();
      nav('/admin');
    }
  };

  return (
    <div className="admin">
      <header className="admin-top">
        <div className="container">
          <Link to="/admin" className="brand" style={{ color: '#fff' }}>
            <span className="brand-mark">A</span>
            <span>DriveFlow<small style={{ color: '#9fb0c8' }}>Staff dashboard · demo</small></span>
          </Link>
          <nav className="admin-tabs" aria-label="Admin">
            {tabs.map((t) => (
              <NavLink key={t.to} to={t.to} end={t.end} className={({ isActive }) => (isActive ? 'active' : '')}>{t.label}</NavLink>
            ))}
            <Link to="/">View customer site</Link>
            <a href="#/admin/login" onClick={(e) => { e.preventDefault(); logout(); }}>Log out</a>
          </nav>
        </div>
      </header>
      <div className="sim-banner">
        <div className="container">
          <strong>Concept demonstration by ComputeX.</strong> Rows tagged “Simulated” are made-up demo data. Enquiries you submit from the customer
          site are real entries in this browser’s storage. No connection to Aman Self Drive’s systems.{' '}
          <button className="btn btn-ghost btn-sm" style={{ marginLeft: 6 }} onClick={reset}>Reset demo data</button>
        </div>
      </div>
      <div className="container" style={{ padding: '22px 16px 60px' }}>
        <Outlet />
      </div>
    </div>
  );
}
