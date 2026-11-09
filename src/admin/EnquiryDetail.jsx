import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useStore, setStatus, saveAdminNotes } from '../store.js';
import { StatusBadge, SimBadge, EstimateBox } from '../components/ui.jsx';
import { EnquiryDetailsList } from '../customer/Confirmation.jsx';
import { customerChatLink, fmtDate } from '../lib/whatsapp.js';
import { STATUSES } from '../config.js';

const ACTIONS = [
  { label: 'Mark as Under Review', status: 'Under Review', cls: 'btn-ghost' },
  { label: 'Mark Quotation Sent', status: 'Quotation Sent', cls: 'btn-ghost' },
  { label: 'Awaiting Customer Confirmation', status: 'Awaiting Customer Confirmation', cls: 'btn-ghost' },
  { label: 'Mark Confirmed', status: 'Confirmed', cls: 'btn-primary' },
  { label: 'Mark Cancelled', status: 'Cancelled', cls: 'btn-danger' },
  { label: 'Reset to New', status: 'New Enquiry', cls: 'btn-ghost' },
];

export default function EnquiryDetail() {
  const { id } = useParams();
  const { enquiries } = useStore();
  const enq = enquiries.find((e) => e.id === id);
  const [notes, setNotes] = useState(enq?.adminNotes || '');
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    setNotes(enq?.adminNotes || '');
  }, [id]); // eslint-disable-line

  if (!enq) {
    return (
      <div className="card stack">
        <h2>Enquiry not found</h2>
        <Link className="btn btn-ghost" to="/admin/enquiries">← Back to enquiries</Link>
      </div>
    );
  }

  const confirmCancel = (s) => {
    if (s === 'Cancelled' && !window.confirm(`Mark ${enq.id} as cancelled?`)) return;
    setStatus(enq.id, s);
  };
  const saveNotes = () => {
    saveAdminNotes(enq.id, notes);
    setSaved(true);
    setTimeout(() => setSaved(false), 1800);
  };

  return (
    <div className="stack">
      <Link to="/admin/enquiries" className="small">← All enquiries</Link>
      <div className="row spread">
        <div className="row">
          <h2>{enq.id}</h2>
          <StatusBadge status={enq.status} />
          {enq.simulated && <SimBadge />}
        </div>
        <a className="btn btn-wa" href={customerChatLink(enq)} target="_blank" rel="noreferrer">Open WhatsApp Conversation</a>
      </div>

      {enq.status === 'Confirmed' && (
        <div className="confirmed-banner" role="status">
          <span aria-hidden style={{ fontSize: '1.4rem' }}>✓</span>
          Confirmed by staff. Remember to share final pickup details with the customer on WhatsApp.
        </div>
      )}
      {enq.status === 'Cancelled' && <div className="notice warn">This enquiry is cancelled.</div>}

      <div className="detail-grid">
        <div className="stack">
          <div className="card stack">
            <h3>Customer &amp; rental requirements</h3>
            <EnquiryDetailsList enq={enq} />
            <p className="small muted">Submitted {fmtDate(enq.createdAt)}</p>
          </div>
          <div className="card stack">
            <h3>Estimated amount</h3>
            <EstimateBox est={enq.estimate} />
            <p className="small muted">Staff to confirm availability and send the final quotation. DriveFlow does not know live fleet availability.</p>
          </div>
        </div>

        <div className="stack">
          <div className="card stack">
            <h3>Update status</h3>
            <div className="status-actions">
              {ACTIONS.map((a) => (
                <button key={a.status} className={`btn btn-sm ${a.cls}`} disabled={enq.status === a.status} onClick={() => confirmCancel(a.status)}>
                  {a.label}
                </button>
              ))}
            </div>
            <label className="small muted" htmlFor="st">Or pick any status</label>
            <select id="st" value={enq.status} onChange={(e) => confirmCancel(e.target.value)}>
              {STATUSES.map((s) => <option key={s}>{s}</option>)}
            </select>
          </div>

          <div className="card stack">
            <h3>Admin notes</h3>
            <textarea aria-label="Admin notes" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Internal notes: availability check, quoted price, follow-up…" />
            <div className="row">
              <button className="btn btn-dark btn-sm" onClick={saveNotes}>Save note</button>
              {saved && <span className="small" style={{ color: 'var(--green)' }} role="status">Saved ✓</span>}
            </div>
            <p className="hint">Internal only. Not shown to the customer.</p>
          </div>

          <div className="card">
            <h3 style={{ marginBottom: 10 }}>Enquiry history</h3>
            <ul className="timeline">
              {[...enq.history].reverse().map((h, i) => (
                <li key={i}>
                  <strong>{h.label}</strong>
                  <div className="small muted">{fmtDate(h.at)} · {h.by}</div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
