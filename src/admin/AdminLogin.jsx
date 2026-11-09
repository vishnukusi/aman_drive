import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CONFIG } from '../config.js';
import { setAdminSession } from '../store.js';
import { Field } from '../components/ui.jsx';

export default function AdminLogin() {
  const nav = useNavigate();
  const [user, setUser] = useState('');
  const [pass, setPass] = useState('');
  const [error, setError] = useState('');

  const submit = (e) => {
    e.preventDefault();
    if (user.trim() === CONFIG.adminUser && pass === CONFIG.adminPass) {
      setAdminSession(true);
      nav('/admin');
    } else {
      setError('Incorrect username or password.');
    }
  };

  return (
    <div className="admin" style={{ padding: 16 }}>
      <form className="card login stack" onSubmit={submit}>
        <div className="brand"><span className="brand-mark">A</span><span>DriveFlow<small>Staff dashboard · demo</small></span></div>
        <div className="notice">
          Demo login only. Username <strong>{CONFIG.adminUser}</strong>, password <strong>{CONFIG.adminPass}</strong>. This is a client-side
          gate for presentation and is <strong>not real security</strong>; production needs proper authentication.
        </div>
        <Field label="Username" htmlFor="u"><input id="u" autoComplete="username" value={user} onChange={(e) => setUser(e.target.value)} /></Field>
        <Field label="Password" htmlFor="p"><input id="p" type="password" autoComplete="current-password" value={pass} onChange={(e) => setPass(e.target.value)} /></Field>
        {error && <p className="error" role="alert">{error}</p>}
        <button className="btn btn-dark btn-block" type="submit">Sign in</button>
        <Link to="/" className="small muted center">← Back to customer site</Link>
      </form>
    </div>
  );
}
