import { useState } from 'react';
import { Link, useOutletContext, useParams } from 'react-router-dom';
import { api, CITY_LABEL, fmtDay, fmtWhenIso, stagesFrom } from '../api/client.js';
import Icon from '../components/Icon.jsx';
import { Modal } from '../components/ui.jsx';
import { LiveDot, useLiveData } from './live.jsx';
import { actorLabel, SourceTag, StatusPill } from './parts.jsx';
import { modeLabel } from '../lib/whatsapp.js';

const FIELD = { vehicleId: 'Car', city: 'City', pickupDate: 'Pickup date', returnDate: 'Return date', pickupTime: 'Pickup time', destination: 'Destination', name: 'Name', mobile: 'Mobile', email: 'Email', tripType: 'Trip type', notes: 'Notes' };
const TEMPLATES = [
  ['enquiry_received', 'Enquiry received'],
  ['details_required', 'Details required'],
  ['quote_ready', 'Quote ready'],
  ['status_update', 'Status update'],
];
const COMM_STATUS = {
  handoff_link: { label: 'Hand-off link (staff sends)', tone: 'amber' },
  not_configured: { label: 'Not sent: API not configured', tone: 'grey' },
  sent: { label: 'Sent via Business API', tone: 'green' },
  failed: { label: 'Failed', tone: 'orange' },
  simulated: { label: 'Simulated', tone: 'grey' },
};
const DANGER = new Set(['REJECTED', 'CANCELLED']);

export default function EnquiryDetail() {
  const { id } = useParams();
  const me = useOutletContext();
  const canWrite = me.user.role !== 'viewer';
  const { data: e, error, reload, lastSync } = useLiveData(() => api(`/api/staff/enquiries/${id}`), [id]);
  const [action, setAction] = useState(null);
  const [notes, setNotes] = useState(null);
  const [msg, setMsg] = useState(null);
  const [flash, setFlash] = useState('');

  if (error && !e) {
    return (
      <div className="stack">
        <Link to="/admin/enquiries" className="small">← Inbox</Link>
        <div className="notice warn">{error.status === 404 ? `No enquiry ${id}.` : error.message}</div>
      </div>
    );
  }
  if (!e) return <div className="muted" role="status">Loading…</div>;

  const statusHistory = e.events.filter((x) => x.to).map((x) => x.to);
  const stages = stagesFrom(statusHistory, e.status);
  const intake = e.intake || {};
  const saveNotes = async () => {
    await api(`/api/staff/enquiries/${e.reference}/notes`, { method: 'POST', body: { notes } });
    setNotes(null);
    setFlash('Note saved');
    reload();
  };
  const sendMsg = async (template) => {
    try {
      const r = await api(`/api/staff/enquiries/${e.reference}/messages`, { method: 'POST', body: { template } });
      setMsg(r.communication);
      reload();
    } catch (err) {
      setMsg({ status: 'failed', error: err.message, body: '' });
    }
  };

  return (
    <div className="ops stack-lg">
      <div className="row spread">
        <Link to="/admin/enquiries" className="small">← Enquiry inbox</Link>
        <LiveDot lastSync={lastSync} />
      </div>

      <header className="detail-head panel">
        <div>
          <small className="muted">Tracking reference</small>
          <div className="ref-code">{e.reference}</div>
          <div className="row" style={{ gap: 8, marginTop: 6 }}>
            <StatusPill status={e.status} /><SourceTag source={e.source} />
            {e.isDemo && <span className="badge sim">Demo data</span>}
            <span className="small muted">Created {fmtWhenIso(e.createdAt)} · updated {fmtWhenIso(e.updatedAt)} · v{e.version}</span>
          </div>
        </div>
        <ol className="stage-track compact" aria-label="Workflow progress">
          {stages.map((s) => (
            <li key={s.id} className={`stage ${s.state}`}>
              <span className="dot" aria-hidden>{s.state === 'done' ? <Icon name="check" size={12} /> : null}</span><span>{s.label}</span>
            </li>
          ))}
        </ol>
      </header>

      {flash && <div className="notice ok" role="status">{flash}</div>}

      <div className="detail-grid">
        <div className="stack-lg">
          <section className="panel">
            <h2 className="panel-title">Next action</h2>
            {!canWrite && <p className="muted small">Your role is read-only.</p>}
            {canWrite && e.allowedTransitions.length === 0 && <p className="muted small">This enquiry is closed. No further status changes are possible.</p>}
            {canWrite && e.allowedTransitions.length > 0 && (
              <div className="action-row">
                {e.allowedTransitions.map((t) => (
                  <button key={t.to} className={`btn btn-sm ${DANGER.has(t.to) ? 'btn-danger' : t.to === 'BOOKING_CONFIRMED' || t.to === 'QUOTE_READY' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setAction(t)}>
                    {t.to === 'QUOTE_READY' ? 'Prepare quote' : `Mark ${t.label.toLowerCase()}`}
                  </button>
                ))}
              </div>
            )}
            {e.status === 'STAFF_REVIEW' && <p className="hint" style={{ marginTop: 10 }}>Check the car is free on these dates in your own records, then prepare a quote. DriveFlow never checks availability itself.</p>}
          </section>

          <section className="panel">
            <h2 className="panel-title">Customer & trip</h2>
            <dl className="kv">
              <dt>Customer</dt><dd>{e.customer.name}</dd>
              <dt>Mobile</dt><dd><a href={`tel:+91${e.customer.mobile}`}>{e.customer.mobile}</a> {e.customer.whatsappOptIn ? <span className="tag-verified">WhatsApp opt-in</span> : <span className="small muted">no WhatsApp opt-in</span>}</dd>
              {e.customer.email && (<><dt>Email</dt><dd>{e.customer.email}</dd></>)}
              <dt>Car</dt><dd>{e.vehicle?.name || <span className="muted">Not chosen</span>}</dd>
              <dt>City</dt><dd>{CITY_LABEL[e.city] || <span className="muted">Not given</span>}</dd>
              <dt>Pickup</dt><dd>{fmtDay(e.pickup.date)}{e.pickup.time ? ` · ${e.pickup.time}` : ''}</dd>
              <dt>Return</dt><dd>{fmtDay(e.ret.date)}{e.ret.time ? ` · ${e.ret.time}` : ''}</dd>
              {e.pickupMode && (<><dt>Handover</dt><dd>{modeLabel(e.pickupMode, e.city)}{e.pickupDetail ? ` (${e.pickupDetail})` : ''} → {modeLabel(e.returnMode, e.city)}</dd></>)}
              {e.destination && (<><dt>Trip</dt><dd>{e.tripType === 'outstation' ? 'Outstation · ' : ''}{e.destination}</dd></>)}
              {e.notes && (<><dt>Notes</dt><dd>{e.notes}</dd></>)}
              {e.estimate && (<><dt>Indicative</dt><dd>₹{e.estimate.amount.toLocaleString('en-IN')} <span className="small muted">{e.estimate.durationLabel}, published rates</span></dd></>)}
              {e.quoteAmount && (<><dt>Quote</dt><dd><b>₹{e.quoteAmount.toLocaleString('en-IN')}</b></dd></>)}
            </dl>
          </section>

          <section className="panel intake-panel">
            <h2 className="panel-title"><Icon name="sparkle" size={18} /> What DriveFlow processed</h2>
            <p className="small muted">{intake.engine ? `${intake.engine.name} v${intake.engine.version} · ${intake.engine.kind} · no AI model connected` : 'Automated intake'}</p>
            {e.rawMessage && <blockquote className="raw-msg">“{e.rawMessage}”</blockquote>}
            <div className="found">
              {Object.entries(intake.draft || {}).filter(([k]) => FIELD[k]).map(([k, v]) => (
                <span key={k} className={`found-chip${(intake.extracted || []).includes(k) ? ' parsed' : ''}`} title={(intake.extracted || []).includes(k) ? 'Extracted from free text' : 'Entered in a form field'}>
                  <small>{FIELD[k]}</small>{k === 'vehicleId' ? (e.vehicle?.id === v ? e.vehicle.name : v) : k === 'city' ? CITY_LABEL[v] : /Date$/.test(k) ? fmtDay(v) : String(v)}
                </span>
              ))}
            </div>
            {(intake.extracted || []).length > 0 && <p className="hint">Highlighted fields were extracted from the customer’s own words.</p>}
            {(intake.missing || []).length > 0 && (
              <div className="notice warn" style={{ marginTop: 10 }}>Missing at intake: {intake.missing.map((m) => FIELD[m] || m).join(', ')}</div>
            )}
            {(intake.suggestions || []).length > 0 && <p className="small" style={{ marginTop: 8 }}>Suggested cars: {intake.suggestions.map((s) => `${s.name} (₹${s.rate24.toLocaleString('en-IN')})`).join(', ')}</p>}
            {(intake.knowledge || []).length > 0 && (
              <details className="knowledge"><summary>Business facts retrieved ({intake.knowledge.length})</summary><ul>{intake.knowledge.map((k) => <li key={k}>{k}</li>)}</ul></details>
            )}
          </section>
        </div>

        <div className="stack-lg">
          <section className="panel">
            <h2 className="panel-title">WhatsApp</h2>
            <p className="small muted">
              {e.whatsappProvider === 'manual'
                ? 'Business API not configured: each button prepares a message and opens WhatsApp for you to send from the business phone. It is recorded as a hand-off, not as delivered.'
                : `Provider: ${e.whatsappProvider}.`}
            </p>
            {canWrite && (
              <div className="action-row">
                {TEMPLATES.map(([t, l]) => (
                  <button key={t} className="btn btn-ghost btn-sm" onClick={() => sendMsg(t)} disabled={t === 'quote_ready' && !e.quoteAmount}>
                    <Icon name="whatsapp" size={15} /> {l}
                  </button>
                ))}
              </div>
            )}
            <ul className="comm-list">
              {e.communications.slice().reverse().map((c) => (
                <li key={c.id}>
                  <div className="row spread"><b>{c.title}</b><span className={`badge ${COMM_STATUS[c.status]?.tone || 'grey'}`}>{COMM_STATUS[c.status]?.label || c.status}</span></div>
                  <p className="small">{c.body}</p>
                  <div className="small muted">{actorLabel(c.actor)} · {fmtWhenIso(c.at)}{c.error ? ` · ${c.error}` : ''}</div>
                </li>
              ))}
              {!e.communications.length && <li className="muted small">No messages yet.</li>}
            </ul>
          </section>

          <section className="panel">
            <div className="row spread">
              <h2 className="panel-title">Staff notes</h2>
              {canWrite && notes === null && <button className="linkish" onClick={() => setNotes(e.staffNotes)}>Edit</button>}
            </div>
            {notes === null ? (
              <p className={e.staffNotes ? '' : 'muted small'} style={{ whiteSpace: 'pre-wrap' }}>{e.staffNotes || 'No notes.'}</p>
            ) : (
              <div className="stack">
                <textarea value={notes} onChange={(ev) => setNotes(ev.target.value)} maxLength={2000} aria-label="Staff notes" />
                <div className="row"><button className="btn btn-dark btn-sm" onClick={saveNotes}>Save note</button><button className="linkish" onClick={() => setNotes(null)}>Cancel</button></div>
              </div>
            )}
          </section>

          <section className="panel">
            <h2 className="panel-title">Audit trail</h2>
            <ul className="audit">
              {e.events.slice().reverse().map((x, i) => (
                <li key={i} className={`ev ev-${x.type}`}>
                  <div>
                    {x.type === 'status' || x.type === 'created'
                      ? <>{x.from ? <><StatusPill status={x.from} /> → </> : null}<StatusPill status={x.to} /></>
                      : <b className="small">{x.type === 'communication' ? 'Message' : x.type === 'note' ? 'Note' : x.type === 'details' ? 'Details added' : x.type}</b>}
                  </div>
                  {x.note && <div className="small">{x.note}</div>}
                  <div className="small muted">{actorLabel(x.actor)} · {fmtWhenIso(x.at)}</div>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>

      {action && <TransitionDialog enquiry={e} action={action} onClose={() => setAction(null)} onDone={(label) => { setAction(null); setFlash(`Status changed to ${label}`); reload(); }} />}
      {msg && (
        <Modal title="WhatsApp message" onClose={() => setMsg(null)}>
          {msg.status === 'handoff_link' ? (
            <div className="stack">
              <p className="small muted">Open WhatsApp and press Send from the business phone. DriveFlow recorded this as a hand-off; it cannot confirm delivery.</p>
              <div className="wa-preview">{msg.body}</div>
              <a className="btn btn-wa btn-block" href={msg.link} target="_blank" rel="noopener noreferrer"><Icon name="whatsapp" size={18} /> Open WhatsApp to the customer</a>
            </div>
          ) : (
            <div className="stack">
              <p><span className={`badge ${COMM_STATUS[msg.status]?.tone || 'grey'}`}>{COMM_STATUS[msg.status]?.label || msg.status}</span></p>
              {msg.body && <div className="wa-preview">{msg.body}</div>}
              {msg.error && <div className="notice warn">{msg.error}</div>}
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}

function TransitionDialog({ enquiry, action, onClose, onDone }) {
  const [note, setNote] = useState('');
  const [amount, setAmount] = useState(enquiry.estimate ? String(enquiry.estimate.amount) : '');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const isQuote = action.to === 'QUOTE_READY';
  const submit = async (ev) => {
    ev.preventDefault();
    setBusy(true);
    setError('');
    try {
      await api(`/api/staff/enquiries/${enquiry.reference}/transition`, {
        method: 'POST',
        body: { to: action.to, note, quoteAmount: isQuote ? Number(amount) : undefined, expectedVersion: enquiry.version },
      });
      onDone(action.label);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  };
  return (
    <Modal title={isQuote ? `Prepare quote · ${enquiry.reference}` : `${action.label} · ${enquiry.reference}`} onClose={onClose}>
      <form className="stack" onSubmit={submit}>
        <p className="small muted"><StatusPill status={enquiry.status} /> → <StatusPill status={action.to} /></p>
        {isQuote && (
          <label className="field">
            <span className="label">Quote amount (₹)</span>
            <input type="number" min="1" step="1" inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value)} required />
            <span className="hint">Prefilled with the indicative estimate from published rates{enquiry.estimate ? ` (₹${enquiry.estimate.amount.toLocaleString('en-IN')})` : ''}. Enter the price you will actually offer.</span>
          </label>
        )}
        <label className="field">
          <span className="label">Note {['REJECTED', 'CANCELLED', 'DETAILS_PENDING', 'BOOKING_CONFIRMED'].includes(action.to) ? '(required)' : '(optional)'}</span>
          <textarea value={note} onChange={(e) => setNote(e.target.value)} maxLength={500}
            placeholder={action.to === 'BOOKING_CONFIRMED' ? 'e.g. Licence and ID verified, deposit received' : action.to === 'REJECTED' ? 'e.g. Car not free on these dates; offered Innova' : ''} />
        </label>
        {error && <div className="notice warn" role="alert">{error}</div>}
        <div className="row"><button className="btn btn-primary" type="submit" disabled={busy}>{busy ? 'Saving…' : 'Confirm change'}</button><button type="button" className="linkish" onClick={onClose}>Cancel</button></div>
      </form>
    </Modal>
  );
}
