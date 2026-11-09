import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Field, Modal } from './ui.jsx';
import Icon from './Icon.jsx';
import { useStore } from '../store.js';
import { CITIES } from '../data/business.js';
import { todayISO } from '../lib/validation.js';
import { submitEnquiry } from '../services/enquiry.js';
import { CONFIG } from '../config.js';

const addDays = (iso, n) => {
  const d = new Date(`${iso}T00:00`);
  d.setDate(d.getDate() + n);
  return todayISO(d);
};

/**
 * One-screen enquiry that hands off to WhatsApp with every detail prefilled.
 * Honest by construction: it never says "booked" or "available"; the customer still presses Send in WhatsApp.
 */
export default function EnquiryForm({ vehicleId = '', city = '', compact = false, idPrefix = 'q' }) {
  const { vehicles } = useStore();
  const catalogue = useMemo(() => vehicles.filter((v) => v.visible).sort((a, b) => a.rate24 - b.rate24), [vehicles]);
  const today = todayISO();
  const [f, setF] = useState({
    vehicleId,
    city: city || '',
    pickupDate: addDays(today, 1),
    returnDate: addDays(today, 2),
    destination: '',
    notes: '',
    name: '',
    mobile: '',
  });
  const [errors, setErrors] = useState({});
  const [sent, setSent] = useState(null);

  const set = (patch) => {
    setF((p) => {
      const next = { ...p, ...patch };
      if (patch.pickupDate && next.returnDate < patch.pickupDate) next.returnDate = patch.pickupDate;
      return next;
    });
    setErrors((e) => {
      const c = { ...e };
      Object.keys(patch).forEach((k) => delete c[k]);
      return c;
    });
  };

  const submit = (ev) => {
    ev.preventDefault();
    const res = submitEnquiry({ ...f, source: compact ? 'vehicle-card' : 'home-quick-enquiry' }, vehicles);
    if (!res.ok) {
      setErrors(res.errors);
      const first = Object.keys(res.errors)[0];
      document.getElementById(`${idPrefix}-${first}`)?.focus();
      return;
    }
    window.open(res.result.url, '_blank', 'noopener,noreferrer');
    setSent(res.result);
  };

  if (sent) {
    return (
      <div className="enq-done" role="status">
        <div className="enq-done-icon"><Icon name="whatsapp" size={28} /></div>
        <h3>WhatsApp is ready with your enquiry</h3>
        <p className="muted">
          Your message is only sent when you press <b>Send</b> in WhatsApp. The Aman Self Drive team then replies with availability and the
          final price. Nothing is booked until they confirm.
        </p>
        <div className="row" style={{ justifyContent: 'center', marginTop: 14 }}>
          <a className="btn btn-wa" href={sent.url} target="_blank" rel="noopener noreferrer"><Icon name="whatsapp" size={18} /> Open WhatsApp again</a>
          <button type="button" className="btn btn-ghost" onClick={() => setSent(null)}>Edit details</button>
        </div>
      </div>
    );
  }

  const id = (k) => `${idPrefix}-${k}`;
  const err = (k) => (errors[k] ? 'invalid' : '');

  return (
    <form className="enq-form" onSubmit={submit} noValidate>
      <div className="form-grid two">
        <Field label="Car" error={errors.vehicleId} htmlFor={id('vehicleId')}>
          <select id={id('vehicleId')} value={f.vehicleId} className={err('vehicleId')} onChange={(e) => set({ vehicleId: e.target.value })}>
            <option value="">Choose a car…</option>
            {catalogue.map((v) => (
              <option key={v.id} value={v.id}>{v.name} · ₹{v.rate24.toLocaleString('en-IN')}/24 hrs</option>
            ))}
          </select>
        </Field>
        <Field label="Pickup city" error={errors.city} htmlFor={id('city')}>
          <select id={id('city')} value={f.city} className={err('city')} onChange={(e) => set({ city: e.target.value })}>
            <option value="">Choose a city…</option>
            {CITIES.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </Field>
        <Field label="Pickup date" error={errors.pickupDate} htmlFor={id('pickupDate')}>
          <input id={id('pickupDate')} type="date" min={today} value={f.pickupDate} className={err('pickupDate')} onChange={(e) => set({ pickupDate: e.target.value })} />
        </Field>
        <Field label="Return date" error={errors.returnDate} htmlFor={id('returnDate')}>
          <input id={id('returnDate')} type="date" min={f.pickupDate || today} value={f.returnDate} className={err('returnDate')} onChange={(e) => set({ returnDate: e.target.value })} />
        </Field>
        <Field label="Your name" error={errors.name} htmlFor={id('name')}>
          <input id={id('name')} autoComplete="name" value={f.name} className={err('name')} onChange={(e) => set({ name: e.target.value })} maxLength={80} />
        </Field>
        <Field label="Mobile number" error={errors.mobile} hint="10-digit Indian mobile" htmlFor={id('mobile')}>
          <input id={id('mobile')} inputMode="tel" autoComplete="tel" value={f.mobile} className={err('mobile')} onChange={(e) => set({ mobile: e.target.value })} placeholder="98765 43210" maxLength={16} />
        </Field>
        <Field label="Trip destination (optional)" error={errors.destination} htmlFor={id('destination')}>
          <input id={id('destination')} value={f.destination} className={err('destination')} onChange={(e) => set({ destination: e.target.value })} placeholder="e.g. Araku Valley, Tirupati" maxLength={120} />
        </Field>
        <Field label="Anything else? (optional)" error={errors.notes} htmlFor={id('notes')}>
          <input id={id('notes')} value={f.notes} className={err('notes')} onChange={(e) => set({ notes: e.target.value })} placeholder="e.g. one-way to Hyderabad, need an automatic" maxLength={500} />
        </Field>
      </div>
      <div className="enq-foot">
        <button type="submit" className="btn btn-wa btn-lg"><Icon name="whatsapp" size={20} /> Continue on WhatsApp</button>
        <p className="hint">
          Opens WhatsApp to {CONFIG.phoneDisplay} with these details filled in. Please do not share ID documents here. Need times, delivery
          and an estimate? <Link to={f.vehicleId ? `/book?car=${f.vehicleId}` : '/book'}>Use the trip planner</Link>.
        </p>
      </div>
    </form>
  );
}

/** Modal wrapper used by the fleet "Enquire now" buttons. */
export function EnquirySheet({ vehicle, city = '', onClose }) {
  return (
    <Modal title={`Enquire: ${vehicle.name}`} onClose={onClose} wide>
      <p className="muted small" style={{ marginBottom: 14 }}>
        Tell us your dates and city. We open WhatsApp with everything filled in; the team replies with availability and the final price.
      </p>
      <EnquiryForm vehicleId={vehicle.id} city={city} compact idPrefix="sheet" />
    </Modal>
  );
}
