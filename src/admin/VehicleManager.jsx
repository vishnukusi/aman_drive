import { useState } from 'react';
import { useStore, saveVehicle, toggleVehicle, removeVehicle } from '../store.js';
import { CATEGORIES } from '../data/vehicles.js';
import { Modal, Field } from '../components/ui.jsx';
import { inr } from '../lib/pricing.js';

const blank = () => ({
  id: '', name: '', category: 'Hatchback', seats: 5, transmission: '', fuel: '',
  rate24: '', rate12: '', extraHour: '', image: '', visible: true, source: 'demo', verified: false,
});

const num = (v) => (v === '' || v == null ? null : Number(v));

export default function VehicleManager() {
  const { vehicles } = useStore();
  const [editing, setEditing] = useState(null); // vehicle object being edited
  const [isNew, setIsNew] = useState(false);
  const [errors, setErrors] = useState({});

  const open = (v) => { setIsNew(false); setErrors({}); setEditing({ ...v, rate12: v.rate12 ?? '', extraHour: v.extraHour ?? '', transmission: v.transmission ?? '', fuel: v.fuel ?? '' }); };
  const openNew = () => { setIsNew(true); setErrors({}); setEditing(blank()); };
  const up = (patch) => setEditing((e) => ({ ...e, ...patch }));

  const save = () => {
    const e = {};
    if (!editing.name.trim()) e.name = 'Enter a vehicle name.';
    if (!(Number(editing.rate24) > 0)) e.rate24 = 'Enter a 24-hour rate above 0.';
    if (editing.rate12 !== '' && !(Number(editing.rate12) > 0)) e.rate12 = 'Enter a valid amount or leave blank.';
    if (editing.extraHour !== '' && !(Number(editing.extraHour) >= 0)) e.extraHour = 'Enter a valid amount or leave blank.';
    if (!(Number(editing.seats) >= 1)) e.seats = 'Seats must be at least 1.';
    if (Object.keys(e).length) return setErrors(e);

    const id = isNew
      ? `custom-${editing.name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now().toString(36)}`
      : editing.id;
    saveVehicle({
      ...editing,
      id,
      name: editing.name.trim(),
      seats: Number(editing.seats),
      transmission: editing.transmission.trim() || null,
      fuel: editing.fuel.trim() || null,
      rate24: Number(editing.rate24),
      rate12: num(editing.rate12),
      extraHour: num(editing.extraHour),
      image: editing.image.trim(),
      // Anything the admin adds or edits is demo configuration, no longer "verified from the website".
      verified: isNew ? false : editing.verified,
      source: isNew ? 'demo (added in dashboard)' : editing.source,
    });
    setEditing(null);
  };

  const del = (v) => {
    if (window.confirm(`Remove ${v.name} from the catalogue? Existing enquiries keep their record.`)) removeVehicle(v.id);
  };

  return (
    <div className="stack">
      <div className="row spread">
        <h2>Vehicles</h2>
        <button className="btn btn-primary btn-sm" onClick={openNew}>+ Add vehicle</button>
      </div>
      <div className="notice warn">
        <strong>Visibility is not availability.</strong> “Visible” only controls whether a car appears in the customer catalogue. DriveFlow has no live
        fleet data; real availability needs the business’s actual booking records and a production integration. Rates below are the ones published on
        amanselfdrivecars.com unless you change them, and are used only for indicative estimates.
      </div>

      <div className="table-wrap">
        <table style={{ minWidth: 820 }}>
          <thead>
            <tr><th>Vehicle</th><th>Type</th><th>Seats</th><th>24 hrs</th><th>12 hrs</th><th>Extra hr</th><th>Source</th><th>In catalogue</th><th></th></tr>
          </thead>
          <tbody>
            {vehicles.map((v) => (
              <tr key={v.id}>
                <td><strong>{v.name}</strong><div className="small muted">{[v.transmission, v.fuel].filter(Boolean).join(' · ') || 'Transmission / fuel not stated'}</div></td>
                <td>{v.category}</td>
                <td>{v.seats}</td>
                <td>{inr(v.rate24)}</td>
                <td>{v.rate12 ? inr(v.rate12) : '—'}</td>
                <td>{v.extraHour ? inr(v.extraHour) : '—'}</td>
                <td>{v.verified ? <span className="tag-verified" style={{ marginLeft: 0 }}>Website</span> : <span className="tag-confirm" style={{ marginLeft: 0 }}>Demo</span>}</td>
                <td>
                  <button className="toggle" role="switch" aria-checked={v.visible} aria-label={`${v.name} visible in customer catalogue`} onClick={() => toggleVehicle(v.id)} />
                </td>
                <td>
                  <div className="row" style={{ gap: 6, flexWrap: 'nowrap' }}>
                    <button className="btn btn-ghost btn-sm" onClick={() => open(v)}>Edit</button>
                    <button className="btn btn-danger btn-sm" onClick={() => del(v)}>Remove</button>
                  </div>
                </td>
              </tr>
            ))}
            {!vehicles.length && <tr><td colSpan={9}><div className="empty" style={{ border: 0 }}>No vehicles. Add one or reset demo data.</div></td></tr>}
          </tbody>
        </table>
      </div>

      {editing && (
        <Modal title={isNew ? 'Add vehicle' : `Edit ${editing.name}`} onClose={() => setEditing(null)}>
          <div className="form-grid">
            <Field label="Name" error={errors.name} htmlFor="vn"><input id="vn" value={editing.name} onChange={(e) => up({ name: e.target.value })} /></Field>
            <div className="form-grid two">
              <Field label="Category" htmlFor="vc">
                <select id="vc" value={editing.category} onChange={(e) => up({ category: e.target.value })}>{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select>
              </Field>
              <Field label="Seats" error={errors.seats} htmlFor="vs"><input id="vs" type="number" min="1" value={editing.seats} onChange={(e) => up({ seats: e.target.value })} /></Field>
              <Field label="Transmission" hint="e.g. Automatic, AT & MT. Blank = not stated" htmlFor="vt"><input id="vt" value={editing.transmission} onChange={(e) => up({ transmission: e.target.value })} /></Field>
              <Field label="Fuel" hint="e.g. CNG, Diesel. Blank = not stated" htmlFor="vf"><input id="vf" value={editing.fuel} onChange={(e) => up({ fuel: e.target.value })} /></Field>
              <Field label="24-hr rate (₹, 400 km)" error={errors.rate24} htmlFor="v24"><input id="v24" type="number" min="0" value={editing.rate24} onChange={(e) => up({ rate24: e.target.value })} /></Field>
              <Field label="12-hr rate (₹, 200 km)" error={errors.rate12} htmlFor="v12"><input id="v12" type="number" min="0" value={editing.rate12} onChange={(e) => up({ rate12: e.target.value })} /></Field>
              <Field label="Extra hour (₹)" error={errors.extraHour} htmlFor="vx"><input id="vx" type="number" min="0" value={editing.extraHour} onChange={(e) => up({ extraHour: e.target.value })} /></Field>
            </div>
            <Field label="Image URL (optional)" hint="Use a photo you have the right to use" htmlFor="vi"><input id="vi" value={editing.image} onChange={(e) => up({ image: e.target.value })} placeholder="https://…" /></Field>
            <label className="row" style={{ gap: 8 }}>
              <input type="checkbox" style={{ width: 20, minHeight: 20 }} checked={editing.visible} onChange={(e) => up({ visible: e.target.checked })} />
              Show in customer catalogue
            </label>
            <div className="row" style={{ justifyContent: 'flex-end' }}>
              <button className="btn btn-ghost" onClick={() => setEditing(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={save}>Save vehicle</button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
