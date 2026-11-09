import { useEffect, useState } from 'react';
import { Link, NavLink, Navigate, Outlet, useNavigate } from 'react-router-dom';
import { api } from '../api/client.js';
import Logo from '../components/Logo.jsx';

const tabs = [
  { to: '/admin', label: 'Overview', end: true },
  { to: '/admin/enquiries', label: 'Enquiry inbox' },
  { to: '/admin/vehicles', label: 'Fleet' },
  { to: '/admin/roadmap', label: 'Roadmap' },
];

export default function AdminLayout() {
  const nav = useNavigate();
  const [me, setMe] = useState(undefined); // undefined = loading, null = signed out

  useEffect(() => {
    api('/api/staff/me').then(setMe).catch(() => setMe(null));
  }, []);

  if (me === undefined) return <div className="admin"><div className="container section muted" role="status">Checking your session…</div></div>;
  if (me === null) return <Navigate to="/admin/login" replace />;

  const logout = async () => {
    await api('/api/staff/logout', { method: 'POST', body: {} }).catch(() => {});
    nav('/admin/login');
  };
  const reset = async () => {
    if (!window.confirm('Reset the demo database? All enquiries are replaced with fresh demo data.')) return;
    await api('/api/staff/demo/reset', { method: 'POST', body: {} });
    nav('/admin');
    window.location.reload();
  };

  return (
    <div className="admin">
      <header className="admin-top">
        <div className="container">
          <Link to="/admin" className="ops-brand">
            <span className="logo-plate small-plate"><Logo height={30} /></span>
            <span>DriveFlow<small>Operations · Aman Self Drive</small></span>
          </Link>
          <nav className="admin-tabs" aria-label="Admin">
            {tabs.map((t) => (
              <NavLink key={t.to} to={t.to} end={t.end} className={({ isActive }) => (isActive ? 'active' : '')}>{t.label}</NavLink>
            ))}
          </nav>
          <div className="admin-user">
            <span title={`Role: ${me.user.role}`}>{me.user.name} <small className={`role role-${me.user.role}`}>{me.user.role}</small></span>
            <Link to="/">Website</Link>
            <button className="linkish light" onClick={logout}>Sign out</button>
          </div>
        </div>
      </header>
      {me.demoMode && (
        <div className="sim-banner">
          <div className="container row spread">
            <span>
              <strong>Demo environment.</strong> Enquiries marked <span className="badge sim">Demo</span> are fictional. Automated intake: {me.intake.kind}, no AI model
              connected. WhatsApp: {me.whatsapp === 'manual' ? 'manual hand-off links (Business API not configured)' : me.whatsapp}.
            </span>
            {me.user.role === 'admin' && <button className="btn btn-ghost btn-sm" onClick={reset}>Reset demo data</button>}
          </div>
        </div>
      )}
      <div className="container admin-main">
        <Outlet context={me} />
      </div>
    </div>
  );
}
