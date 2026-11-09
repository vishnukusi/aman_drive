import { useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useStore } from '../store.js';
import { EstimateBox, Field, StatusBadge } from '../components/ui.jsx';
import Icon from '../components/Icon.jsx';
import { EnquiryDetailsList } from './Confirmation.jsx';
import { fmtDate } from '../lib/whatsapp.js';
import { api, fmtDay, fmtWhenIso, stagesFrom, STATUS_META, useBackend, usePolling } from '../api/client.js';
import { CITIES } from '../data/business.js';
import { usePageMeta } from '../lib/meta.js';

const LAST4_KEY = (ref) => `driveflow.track.${ref}`;
const readLast4 = (ref) => { try { return sessionStorage.getItem(LAST4_KEY(ref)) || ''; } catch { return ''; } };
const saveLast4 = (ref, v) => { try { sessionStorage.setItem(LAST4_KEY(ref), v); } catch { /* private mode */ } };

export default function Track() {
  const backend = useBackend();
  const { ref } = useParams();
  usePageMeta('Track your enquiry | Aman Self Drive Car Rentals', 'Check the status of your Aman Self Drive rental enquiry with your tracking reference.');
  if (backend.loading) return <div className="container section muted" role="status">Loading…</div>;
  if (!backend.available) return <LegacyTrack />;
  return ref ? <LiveTrack reference={ref.toUpperCase()} /> : <TrackLookup />;
}

/* ---------------------------------------------------------------- lookup (reference + last 4 digits) */
function TrackLookup() {
  const nav = useNavigate();
  const [ref, setRef] = useState('');
  const [last4, setLast4] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async (ev) => {
    ev.preventDefault();
    setError('');
    const reference = ref.trim().toUpperCase().replace(/^DF(?!-)/, 'DF-');
    const digits = last4.replace(/\D/g, '');
    if (!/^DF-[A-Z0-9]{6}$/.test(reference)) return setError('Enter your tracking reference, e.g. DF-A7K92X.');
    if (digits.length !== 4) return setError('Enter the last 4 digits of the mobile number you used.');
    setBusy(true);
    try {
      await api('/api/track/lookup', { method: 'POST', body: { reference, last4: digits } });
      saveLast4(reference, digits);
      nav(`/track/${reference}`);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="container section" style={{ maxWidth: 760 }}>
      <div className="section-head">
        <div className="eyebrow">DriveFlow tracking</div>
        <h1 className="h2">Track your enquiry</h1>
        <p>Use the link you received when you sent your enquiry, or enter your reference and the last 4 digits of your mobile number.</p>
      </div>
      <form className="card form-grid two" onSubmit={submit} noValidate>
        <Field label="Tracking reference" htmlFor="tid"><input id="tid" value={ref} onChange={(e) => setRef(e.target.value)} placeholder="DF-A7K92X" autoCapitalize="characters" maxLength={9} /></Field>
        <Field label="Last 4 digits of mobile" htmlFor="t4"><input id="t4" inputMode="numeric" maxLength={4} value={last4} onChange={(e) => setLast4(e.target.value)} placeholder="3210" /></Field>
        <div style={{ gridColumn: '1 / -1' }}>
          {error && <p className="error" role="alert" style={{ marginBottom: 10 }}>{error}</p>}
          <button className="btn btn-primary" type="submit" disabled={busy}>{busy ? 'Checking…' : 'Find enquiry'}</button>
        </div>
      </form>
      <div style={{ marginTop: 20 }}><Link to="/?s=enquire" className="btn btn-ghost">Start a new enquiry</Link></div>
    </div>
  );
}

/* ---------------------------------------------------------------- live view (polls the server) */
function LiveTrack({ reference }) {
  const [params] = useSearchParams();
  const key = params.get('k') || '';
  const last4 = key ? '' : readLast4(reference);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [updatedFlash, setUpdatedFlash] = useState(false);
  const auth = key ? `k=${encodeURIComponent(key)}` : `last4=${last4}`;

  usePolling(async () => {
    if (!key && !last4) return setError('auth');
    try {
      const d = await api(`/api/track/${reference}?${auth}`);
      setData((prev) => {
        if (prev && prev.enquiry.version !== d.enquiry.version) {
          setUpdatedFlash(true);
          setTimeout(() => setUpdatedFlash(false), 2500);
        }
        return d;
      });
      setError('');
    } catch (err) {
      setError(err.status === 404 ? 'auth' : err.message);
    }
  }, 6000, [reference, auth]);

  if (error === 'auth') {
    return (
      <div className="container section" style={{ maxWidth: 640 }}>
        <div className="card stack">
          <h1 className="h2">Enquiry {reference}</h1>
          <p className="muted">To protect your details, this page needs your private tracking link, or the last 4 digits of your mobile number.</p>
          <Link className="btn btn-primary" to="/track">Enter reference and digits</Link>
        </div>
      </div>
    );
  }
  if (!data) return <div className="container section muted" role="status">{error || 'Loading your enquiry…'}</div>;

  const e = data.enquiry;
  const stages = stagesFrom(data.timeline.map((t) => t.status).filter(Boolean), e.status);
  return (
    <div className="container section track-page">
      <div className="track-head">
        <div>
          <div className="eyebrow">DriveFlow tracking</div>
          <h1 className="h2">Hello {e.firstName}</h1>
          <p className="muted">Enquiry <b className="mono">{e.reference}</b> · mobile {e.mobileMasked}{e.isDemo ? ' · demo data' : ''}</p>
        </div>
        <div className={`status-pill tone-${STATUS_META[e.status].tone}${updatedFlash ? ' flash' : ''}`} aria-live="polite">
          <small>Current status</small>
          <b>{e.statusLabel}</b>
        </div>
      </div>

      <ol className="stage-track" aria-label="Progress">
        {stages.map((s) => (
          <li key={s.id} className={`stage ${s.state}`}>
            <span className="dot" aria-hidden>{s.state === 'done' ? <Icon name="check" size={14} /> : null}</span>
            <span>{s.label}</span>
          </li>
        ))}
      </ol>

      <div className="track-grid">
        <div className="stack">
          <div className="card next-card">
            <h3>What happens next</h3>
            <p>{e.next}</p>
            {e.quoteAmount && <p className="quote-line">Quote from the team: <b>₹{e.quoteAmount.toLocaleString('en-IN')}</b> <span className="muted small">(fuel & tolls extra)</span></p>}
            <a className="btn btn-wa" href={e.whatsappLink} target="_blank" rel="noopener noreferrer"><Icon name="whatsapp" size={18} /> Message the team about {e.reference}</a>
          </div>
          {e.status === 'DETAILS_PENDING' && <DetailsForm reference={e.reference} auth={{ k: key || undefined, last4: last4 || undefined }} enquiry={e} onDone={setData} />}
          <div className="card">
            <h3 style={{ marginBottom: 10 }}>Your request</h3>
            <dl className="kv">
              <dt>Car</dt><dd>{e.vehicle || <span className="muted">Not chosen yet</span>}</dd>
              <dt>Pickup city</dt><dd>{e.city || <span className="muted">Not given yet</span>}</dd>
              <dt>Pickup</dt><dd>{fmtDay(e.pickupDate)}</dd>
              <dt>Return</dt><dd>{fmtDay(e.returnDate)}</dd>
              {e.destination && (<><dt>Trip</dt><dd>{e.destination}</dd></>)}
              {e.estimate && (<><dt>Indicative</dt><dd>₹{e.estimate.amount.toLocaleString('en-IN')} <span className="muted small">from published rates</span></dd></>)}
            </dl>
          </div>
        </div>
        <div className="card">
          <h3 style={{ marginBottom: 10 }}>Activity</h3>
          <ul className="timeline">
            {data.timeline.map((t, i) => (
              <li key={i}><strong>{t.label}</strong><div className="small muted">{t.by} · {fmtWhenIso(t.at)}</div></li>
            ))}
          </ul>
          <p className="hint" style={{ marginTop: 12 }}>This page refreshes automatically. Nothing is booked until the Aman team confirms.</p>
        </div>
      </div>
    </div>
  );
}

function DetailsForm({ reference, auth, enquiry, onDone }) {
  const { vehicles } = useStore();
  const [f, setF] = useState({});
  const [errors, setErrors] = useState({});
  const [busy, setBusy] = useState(false);
  const missing = enquiry.missing || [];
  const submit = async (ev) => {
    ev.preventDefault();
    setBusy(true);
    setErrors({});
    try {
      const d = await api(`/api/track/${reference}/details`, { method: 'POST', body: { ...auth, fields: f } });
      onDone({ enquiry: d.enquiry, timeline: d.timeline });
      setF({});
    } catch (err) {
      setErrors({ ...(err.fields || {}), _: err.message });
    } finally {
      setBusy(false);
    }
  };
  return (
    <form className="card stack details-card" onSubmit={submit} noValidate>
      <h3>Add the missing details</h3>
      <ul className="questions">{enquiry.questions.map((q) => <li key={q.field}>{q.question}</li>)}</ul>
      <div className="form-grid two">
        {missing.includes('vehicleId') && (
          <Field label="Car" htmlFor="dm-car" error={errors.vehicleId}>
            <select id="dm-car" value={f.vehicleId || ''} onChange={(e) => setF({ ...f, vehicleId: e.target.value })}>
              <option value="">Choose a car…</option>
              {vehicles.filter((v) => v.visible).map((v) => <option key={v.id} value={v.id}>{v.name} · ₹{v.rate24.toLocaleString('en-IN')}/24 hrs</option>)}
            </select>
          </Field>
        )}
        {missing.includes('city') && (
          <Field label="Pickup city" htmlFor="dm-city" error={errors.city}>
            <select id="dm-city" value={f.city || ''} onChange={(e) => setF({ ...f, city: e.target.value })}>
              <option value="">Choose a city…</option>
              {CITIES.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </Field>
        )}
        {missing.includes('pickupDate') && (
          <Field label="Pickup date" htmlFor="dm-pd" error={errors.pickupDate}><input id="dm-pd" type="date" value={f.pickupDate || ''} onChange={(e) => setF({ ...f, pickupDate: e.target.value })} /></Field>
        )}
        {missing.includes('returnDate') && (
          <Field label="Return date" htmlFor="dm-rd" error={errors.returnDate}><input id="dm-rd" type="date" value={f.returnDate || ''} onChange={(e) => setF({ ...f, returnDate: e.target.value })} /></Field>
        )}
      </div>
      {errors._ && <div className="notice warn" role="alert">{errors._}</div>}
      <button className="btn btn-primary" type="submit" disabled={busy}>{busy ? 'Updating…' : 'Update my enquiry'}</button>
    </form>
  );
}

/* ---------------------------------------------------------------- legacy (no backend: browser-only demo store) */
function LegacyTrack() {
  const { enquiries } = useStore();
  const [id, setId] = useState('');
  const [last4, setLast4] = useState('');
  const [error, setError] = useState('');
  const [foundId, setFoundId] = useState(null);
  const found = enquiries.find((e) => e.id === foundId) || null;

  const lookup = (ev) => {
    ev.preventDefault();
    setError('');
    setFoundId(null);
    const cleanId = id.trim().toUpperCase();
    const digits = last4.replace(/\D/g, '');
    if (!/^DF-\d{3,}$/.test(cleanId)) return setError('Enter your enquiry ID, e.g. DF-1001.');
    if (digits.length !== 4) return setError('Enter the last 4 digits of the mobile number you used.');
    const match = enquiries.find((e) => e.id === cleanId && String(e.customer.mobile).endsWith(digits));
    if (!match) return setError('We could not find an enquiry matching those details.');
    setFoundId(match.id);
  };

  return (
    <div className="container section" style={{ maxWidth: 760 }}>
      <div className="section-head">
        <h2>Track your enquiry</h2>
        <p>Enter your enquiry ID and the last 4 digits of your mobile number.</p>
      </div>
      <form className="card form-grid two" onSubmit={lookup} noValidate>
        <Field label="Enquiry ID" htmlFor="tid"><input id="tid" value={id} onChange={(e) => setId(e.target.value)} placeholder="DF-1001" autoCapitalize="characters" /></Field>
        <Field label="Last 4 digits of mobile" htmlFor="t4"><input id="t4" inputMode="numeric" maxLength={4} value={last4} onChange={(e) => setLast4(e.target.value)} placeholder="3210" /></Field>
        <div style={{ gridColumn: '1 / -1' }}>
          {error && <p className="error" role="alert" style={{ marginBottom: 10 }}>{error}</p>}
          <button className="btn btn-primary" type="submit">Find enquiry</button>
        </div>
      </form>
      <p className="hint" style={{ marginTop: 10 }}>
        Offline demo: the DriveFlow server is not connected to this preview, so only requests made in this browser can be found.
      </p>
      {found && (
        <div className="card stack" style={{ marginTop: 18 }}>
          <div className="row spread"><h3>{found.id}</h3><StatusBadge status={found.status} /></div>
          <EnquiryDetailsList enq={found} />
          <EstimateBox est={found.estimate} />
          <h3>Progress</h3>
          <ul className="timeline">
            {found.history.map((h, i) => <li key={i}><strong>{h.label}</strong><div className="small muted">{fmtDate(h.at)}</div></li>)}
          </ul>
        </div>
      )}
      <div style={{ marginTop: 20 }}><Link to="/book" className="btn btn-ghost">Start a new request</Link></div>
    </div>
  );
}

