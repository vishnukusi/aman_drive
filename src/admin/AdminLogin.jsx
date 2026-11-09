import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Field } from '../components/ui.jsx';
import { api, useBackend } from '../api/client.js';
import Logo from '../components/Logo.jsx';

export default function AdminLogin() {
  const nav = useNavigate();
  const backend = useBackend();
  const [user, setUser] = useState('');
  const [pass, setPass] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await api('/api/staff/login', { method: 'POST', body: { username: user.trim().toLowerCase(), password: pass } });
      nav('/admin');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="admin login-screen">
      <form className="card login stack" onSubmit={submit}>
        <div className="row spread">
          <Logo height={44} />
          <span className="ops-badge">DriveFlow · Staff</span>
        </div>
        <h1 className="h3">Sign in to the operations dashboard</h1>
        {!backend.loading && !backend.available && (
          <div className="notice warn">The DriveFlow server is not connected to this deployment, so staff sign-in is unavailable here.</div>
        )}
        {backend.available && backend.demoMode && (
          <div className="notice">
            <b>Demo environment.</b> Users <code>admin</code>, <code>staff</code> (can update enquiries) and <code>viewer</code> (read-only).
            The demo password is in the project README. Data here is fictional unless marked otherwise.
          </div>
        )}
        <Field label="Username" htmlFor="u"><input id="u" autoComplete="username" value={user} onChange={(e) => setUser(e.target.value)} /></Field>
        <Field label="Password" htmlFor="p"><input id="p" type="password" autoComplete="current-password" value={pass} onChange={(e) => setPass(e.target.value)} /></Field>
        {error && <p className="error" role="alert">{error}</p>}
        <button className="btn btn-dark btn-block" type="submit" disabled={busy || !backend.available}>{busy ? 'Signing in…' : 'Sign in'}</button>
        <Link to="/" className="small muted center">← Back to customer site</Link>
      </form>
    </div>
  );
}
