import { useState } from 'react';
import Icon from './Icon.jsx';
import { Field } from './ui.jsx';
import { api, CITY_LABEL, fmtDay } from '../api/client.js';
import EnquiryReceipt from './EnquiryReceipt.jsx';
import { normalizeMobile } from '../lib/validation.js';

const FIELD_LABEL = { vehicleId: 'Car', city: 'Pickup city', pickupDate: 'Pickup date', returnDate: 'Return date', pickupTime: 'Pickup time', destination: 'Trip', name: 'Name', mobile: 'Mobile', email: 'Email', tripType: 'Trip type', notes: 'Notes' };
const EXAMPLES = [
  'Need a Creta in Vijayawada from tomorrow for 3 days, trip to Araku',
  'Looking for an automatic SUV in Hyderabad this weekend for 6 people',
  'One way from Vizag to Vijayawada on 20 Nov, Innova Crysta',
];

/**
 * "Describe your trip" intake. The server's rule-based engine extracts the details, lists what is missing and suggests cars
 * from the published catalogue. Nothing is saved until the customer presses Send enquiry.
 */
export default function IntakeAssistant({ vehicles }) {
  const [message, setMessage] = useState('');
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [optIn, setOptIn] = useState(false);
  const [preview, setPreview] = useState(null);
  const [vehicleId, setVehicleId] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [fieldErrors, setFieldErrors] = useState({});
  const [created, setCreated] = useState(null);

  const nameOf = (id) => vehicles.find((v) => v.id === id)?.name || id;
  const show = (k, v) => (k === 'vehicleId' ? nameOf(v) : k === 'city' ? CITY_LABEL[v] : /Date$/.test(k) ? fmtDay(v) : String(v));

  const check = async (ev) => {
    ev?.preventDefault();
    setError('');
    if (message.trim().length < 8) return setError('Describe your trip in a sentence, for example one of the examples below.');
    setBusy(true);
    try {
      const p = await api('/api/intake/preview', { method: 'POST', body: { message, name, mobile, vehicleId: vehicleId || undefined } });
      setPreview(p);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const send = async () => {
    setError('');
    setFieldErrors({});
    setBusy(true);
    try {
      const out = await api('/api/enquiries', { method: 'POST', body: { message, name, mobile, vehicleId: vehicleId || undefined, source: 'chat-intake', whatsappOptIn: optIn } });
      setCreated(out);
    } catch (err) {
      setFieldErrors(err.fields || {});
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  if (created) return <EnquiryReceipt created={created} onReset={() => { setCreated(null); setPreview(null); setMessage(''); }} />;

  const contactMissing = [name.trim().length < 2 && 'name', !normalizeMobile(mobile) && 'mobile'].filter(Boolean);
  return (
    <div className="intake">
      <form onSubmit={check} noValidate>
        <Field label="Describe your trip in your own words" htmlFor="intake-msg" hint="Car, city, dates, where you are going: whatever you know.">
          <textarea id="intake-msg" value={message} onChange={(e) => { setMessage(e.target.value); setPreview(null); }} maxLength={1200}
            placeholder="e.g. Need a 7 seater in Vijayawada from 20 Nov to 23 Nov for a family trip to Tirupati" />
        </Field>
        <div className="chips" style={{ margin: '8px 0 14px' }}>
          {EXAMPLES.map((x) => (
            <button key={x} type="button" className="chip chip-btn" onClick={() => { setMessage(x); setPreview(null); }}>{x}</button>
          ))}
        </div>
        <div className="form-grid two">
          <Field label="Your name" htmlFor="intake-name" error={fieldErrors.name}><input id="intake-name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" maxLength={80} /></Field>
          <Field label="Mobile number" htmlFor="intake-mobile" hint="10-digit Indian mobile" error={fieldErrors.mobile}><input id="intake-mobile" value={mobile} onChange={(e) => setMobile(e.target.value)} inputMode="tel" autoComplete="tel" maxLength={16} placeholder="98765 43210" /></Field>
        </div>
        {error && <div className="notice warn" role="alert" style={{ marginTop: 12 }}>{error}</div>}
        <div className="row" style={{ marginTop: 14 }}>
          <button type="submit" className="btn btn-dark" disabled={busy}><Icon name="sparkle" size={18} /> {busy && !preview ? 'Reading…' : 'Check my request'}</button>
          <span className="engine-tag">Automated intake · rule-based, no AI model connected</span>
        </div>
      </form>

      {preview && (
        <div className="intake-result" aria-live="polite">
          <h4>What DriveFlow understood</h4>
          <div className="found">
            {Object.entries(preview.draft).filter(([k]) => FIELD_LABEL[k] && !['name', 'mobile'].includes(k)).map(([k, v]) => (
              <span key={k} className="found-chip"><small>{FIELD_LABEL[k]}</small>{show(k, v)}</span>
            ))}
            {!Object.keys(preview.draft).some((k) => FIELD_LABEL[k] && !['name', 'mobile'].includes(k)) && <span className="muted small">No trip details recognised yet.</span>}
          </div>
          {Object.keys(preview.errors).length > 0 && (
            <div className="notice warn" style={{ marginTop: 10 }}>{Object.values(preview.errors).join(' ')}</div>
          )}
          {preview.suggestions.length > 0 && (
            <>
              <h4>Suggested from the fleet (published rates)</h4>
              <div className="chips">
                {preview.suggestions.map((s) => (
                  <button key={s.id} type="button" className={`chip chip-btn${vehicleId === s.id ? ' on' : ''}`} aria-pressed={vehicleId === s.id} onClick={() => setVehicleId(vehicleId === s.id ? '' : s.id)}>
                    {s.name} · ₹{s.rate24.toLocaleString('en-IN')}/24 hrs
                  </button>
                ))}
              </div>
            </>
          )}
          {preview.estimate && <p className="small" style={{ marginTop: 10 }}>Indicative: <b>₹{preview.estimate.amount.toLocaleString('en-IN')}</b> for {preview.estimate.durationLabel}, from published rates. Fuel and tolls extra.</p>}
          {preview.questions.filter((q) => !(q.field === 'vehicleId' && vehicleId)).length > 0 && (
            <>
              <h4>Still needed</h4>
              <ul className="questions">{preview.questions.filter((q) => !(q.field === 'vehicleId' && vehicleId)).map((q) => <li key={q.field}>{q.question}</li>)}</ul>
              <p className="hint">You can send now and add the rest on your tracking page, or edit your message and check again.</p>
            </>
          )}
          <label className="check">
            <input type="checkbox" checked={optIn} onChange={(e) => setOptIn(e.target.checked)} />
            <span>Send me updates about this enquiry on WhatsApp (optional).</span>
          </label>
          <div className="row" style={{ marginTop: 12 }}>
            <button type="button" className="btn btn-primary" onClick={send} disabled={busy || contactMissing.length > 0}>
              {busy ? 'Saving…' : 'Send enquiry'} <Icon name="arrow" size={16} />
            </button>
            {contactMissing.length > 0 && <span className="small muted">Add your name and mobile number first.</span>}
          </div>
          <p className="hint" style={{ marginTop: 8 }}>{preview.guardrails.join(' ')}</p>
        </div>
      )}
    </div>
  );
}
