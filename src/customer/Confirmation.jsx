import { useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { useStore, getEnquiry, isMine } from '../store.js';
import { EstimateBox, StatusBadge } from '../components/ui.jsx';
import { buildCustomerMessage, fmtDate, fmtWhen, locationText, waLink } from '../lib/whatsapp.js';
import { CONFIG } from '../config.js';

export function EnquiryDetailsList({ enq }) {
  return (
    <dl className="kv">
      <dt>Vehicle</dt><dd>{enq.vehicleName}</dd>
      <dt>Pickup</dt><dd>{fmtWhen(enq.pickup.date, enq.pickup.time)}</dd>
      <dt>Return</dt><dd>{fmtWhen(enq.ret.date, enq.ret.time)}</dd>
      <dt>Duration</dt><dd>{enq.durationLabel}</dd>
      <dt>Pickup at</dt><dd>{locationText(enq.pickupMode, enq.pickupDetail)}</dd>
      <dt>Return at</dt><dd>{locationText(enq.returnMode, enq.returnDetail)}</dd>
      <dt>Trip</dt><dd>{enq.tripType === 'city' ? 'Within the city' : 'Outstation'} · {enq.destination}</dd>
      {enq.notes && (<><dt>Notes</dt><dd>{enq.notes}</dd></>)}
      <dt>Name</dt><dd>{enq.customer.name}</dd>
      <dt>Mobile</dt><dd>{enq.customer.mobile}</dd>
      {enq.customer.email && (<><dt>Email</dt><dd>{enq.customer.email}</dd></>)}
    </dl>
  );
}

export default function Confirmation() {
  const { id } = useParams();
  const { state } = useLocation();
  useStore(); // re-render if the status changes in the admin tab
  const enq = getEnquiry(id);
  const [copied, setCopied] = useState(false);

  const allowed = enq && (state?.fresh || isMine(id));
  if (!allowed) {
    return (
      <div className="container section">
        <div className="card stack" style={{ maxWidth: 560, margin: '0 auto' }}>
          <h2>Enquiry not available here</h2>
          <p className="muted">
            For privacy, an enquiry opens directly only in the session that created it. Use <strong>Track Enquiry</strong> with your
            enquiry ID and the last 4 digits of your mobile number.
          </p>
          <Link className="btn btn-primary" to="/track">Track an enquiry</Link>
        </div>
      </div>
    );
  }

  const message = buildCustomerMessage(enq);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt('Copy this message:', message);
    }
  };

  return (
    <div className="container section" style={{ maxWidth: 860 }}>
      <div className="success-hero">
        <div className="tick" aria-hidden>✓</div>
        <h2>Your booking request has been received.</h2>
        <p className="muted" style={{ marginTop: 8, maxWidth: 560, marginInline: 'auto' }}>
          The Aman Self Drive team will review your requirements and confirm availability and final pricing.
        </p>
        <div className="id-pill">Enquiry ID: {enq.id}</div>
        <div style={{ marginTop: 10 }}><StatusBadge status={enq.status} /></div>
      </div>

      <div className="notice warn" style={{ marginTop: 22 }}>
        <strong>One more step:</strong> this concept demo has no live link to the business, so your request is saved in this browser only.
        Tap the button below to send it to Aman Self Drive on WhatsApp. It opens WhatsApp with the message ready; it is only sent when you press Send.
      </div>

      <div className="card stack" style={{ marginTop: 16 }}>
        <div className="row spread">
          <h3>Send on WhatsApp</h3>
          <span className="small muted">To {CONFIG.phoneDisplay}</span>
        </div>
        <div className="wa-preview">{message}</div>
        <div className="row">
          <a className="btn btn-wa grow" href={waLink(message)} target="_blank" rel="noreferrer">Continue on WhatsApp</a>
          <button className="btn btn-ghost" onClick={copy}>{copied ? 'Copied ✓' : 'Copy message'}</button>
        </div>
        <p className="hint">Opening WhatsApp is a simple link. It is not a WhatsApp Business integration, and no reply is generated automatically.</p>
      </div>

      <div className="card stack" style={{ marginTop: 16 }}>
        <h3>Your request</h3>
        <EnquiryDetailsList enq={enq} />
        <EstimateBox est={enq.estimate} />
      </div>

      <div className="card" style={{ marginTop: 16 }}>
        <h3 style={{ marginBottom: 10 }}>Progress</h3>
        <ul className="timeline">
          {enq.history.map((h, i) => (
            <li key={i}><strong>{h.label}</strong><div className="small muted">{fmtDate(h.at)}</div></li>
          ))}
        </ul>
      </div>

      <div className="row" style={{ marginTop: 20, justifyContent: 'center' }}>
        <Link className="btn btn-ghost" to="/track">Track this enquiry later</Link>
        <Link className="btn btn-ghost" to="/cars">Browse more cars</Link>
      </div>
    </div>
  );
}
