import { useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import { api } from '../api/client.js';
import { useLiveData } from './live.jsx';
import { Field, Modal } from '../components/ui.jsx';

export default function VehicleManager() {
  const me = useOutletContext();
  const isAdmin = me.user.role === 'admin';
  const { data, error, reload } = useLiveData(() => api('/api/staff/vehicles'), [], { interval: 15000 });
  const [editing, setEditing] = useState(null);

  const toggle = async (v) => {
    await api(`/api/staff/vehicles/${v.id}`, { method: 'PATCH', body: { visible: !v.visible } });
    reload();
  };

  if (error && !data) return <div className="notice warn">{error.message}</div>;
  if (!data) return <div className="muted" role="status">Loading…</div>;
  return (
    <div className="ops stack-lg">
      <div>
        <h1 className="h2">Fleet catalogue</h1>
        <p className="muted small">
          Rates published on amanselfdrivecars.com. DriveFlow uses them for indicative estimates only; hiding a car removes it from new
          enquiries. This list is <b>not</b> live availability.{!isAdmin && ' Only admins can edit.'}
        </p>
      </div>
      <div className="table-wrap">
        <table>
          <thead><tr><th>Car</th><th>Type</th><th>24 hrs · 400 km</th><th>12 hrs · 200 km</th><th>Extra hr</th><th>Source</th><th>Shown on site</th><th /></tr></thead>
          <tbody>
            {data.items.map((v) => (
              <tr key={v.id}>
                <td><b>{v.name}</b></td>
                <td className="small">{v.category} · {v.seats} seats{v.transmission ? ` · ${v.transmission}` : ''}</td>
                <td>₹{v.rate24.toLocaleString('en-IN')}</td>
                <td>{v.rate12 ? `₹${v.rate12.toLocaleString('en-IN')}` : <span className="muted">—</span>}</td>
                <td>{v.extraHour ? `₹${v.extraHour}` : <span className="muted">—</span>}</td>
                <td>{v.verified ? <span className="tag-verified" style={{ marginLeft: 0 }}>Website</span> : <span className="tag-confirm" style={{ margin: 0 }}>Edited</span>}</td>
                <td>
                  <button className="toggle" role="switch" aria-checked={v.visible} aria-label={`Show ${v.name} on the site`} disabled={!isAdmin} onClick={() => toggle(v)} />
                </td>
                <td>{isAdmin && <button className="linkish" onClick={() => setEditing(v)}>Edit rates</button>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {editing && <RateDialog v={editing} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); reload(); }} />}
    </div>
  );
}

function RateDialog({ v, onClose, onSaved }) {
  const [f, setF] = useState({ rate24: String(v.rate24), rate12: v.rate12 ? String(v.rate12) : '', extraHour: v.extraHour ? String(v.extraHour) : '' });
  const [errors, setErrors] = useState({});
  const num = (s) => (s === '' ? null : Number(s));
  const save = async (e) => {
    e.preventDefault();
    try {
      await api(`/api/staff/vehicles/${v.id}`, { method: 'PATCH', body: { rate24: num(f.rate24), rate12: num(f.rate12), extraHour: num(f.extraHour) } });
      onSaved();
    } catch (err) {
      setErrors({ ...(err.fields || {}), _: err.message });
    }
  };
  return (
    <Modal title={`Rates · ${v.name}`} onClose={onClose}>
      <form className="stack" onSubmit={save}>
        <p className="small muted">Changing a rate marks the car as edited (no longer matching the published website price).</p>
        <Field label="24 hrs · 400 km (₹)" error={errors.rate24} htmlFor="r24"><input id="r24" inputMode="numeric" value={f.rate24} onChange={(e) => setF({ ...f, rate24: e.target.value })} /></Field>
        <Field label="12 hrs · 200 km (₹, blank if not offered)" error={errors.rate12} htmlFor="r12"><input id="r12" inputMode="numeric" value={f.rate12} onChange={(e) => setF({ ...f, rate12: e.target.value })} /></Field>
        <Field label="Extra hour (₹, blank if not listed)" error={errors.extraHour} htmlFor="rx"><input id="rx" inputMode="numeric" value={f.extraHour} onChange={(e) => setF({ ...f, extraHour: e.target.value })} /></Field>
        {errors._ && <div className="notice warn">{errors._}</div>}
        <div className="row"><button className="btn btn-primary" type="submit">Save rates</button><button type="button" className="linkish" onClick={onClose}>Cancel</button></div>
      </form>
    </Modal>
  );
}
