import { useState } from 'react';
import { Link, useLocation, useParams } from 'react-router-dom';
import { useStore, getEnquiry, isMine } from '../store.js';
import { EstimateBox, StatusBadge } from '../components/ui.jsx';
import { CITY_NAMES, buildCustomerMessage, fmtDate, fmtWhen, locationText, waLink } from '../lib/whatsapp.js';
import Icon from '../components/Icon.jsx';
import { CONFIG } from '../config.js';

export function EnquiryDetailsList({ enq }) {
  return (
    <dl className="kv">
      <dt>Vehicle</dt><dd>{enq.vehicleName}</dd>
      <dt>Pickup</dt><dd>{fmtWhen(enq.pickup.date, enq.pickup.time)}</dd>
      <dt>Return</dt><dd>{fmtWhen(enq.ret.date, enq.ret.time)}</dd>
      <dt>Duration</dt><dd>{enq.durationLabel}</dd>
      {enq.city && (<><dt>City</dt><dd>{CITY_NAMES[enq.city] || enq.city}</dd></>)}
      <dt>Pickup at</dt><dd>{locationText(enq.pickupMode, enq.pickupDetail, enq.city)}</dd>
      <dt>Return at</dt><dd>{locationText(enq.returnMode, enq.returnDetail, enq.city)}</dd>
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
        <div className="tick" aria-hidden><Icon name="whatsapp" size={30} /></div>
        <h1 className="h2">Your enquiry is ready to send</h1>
        <p className="muted" style={{ marginTop: 8, maxWidth: 580, marginInline: 'auto' }}>
          One more step: send it to Aman Self Drive on WhatsApp. The team then reviews your requirements and confirms availability and the
          final price. Nothing is booked until they confirm.
        </p>
        <div className="id-pill">Enquiry ID: {enq.id}</div>
      </div>

      <div className="notice warn" style={{ marginTop: 22 }}>
        <strong>Not sent yet.</strong> Tap <b>Continue on WhatsApp</b>: it opens WhatsApp with the message below filled in, and it is only sent when
        you press Send.{CONFIG.demoMode ? ' In this preview build the enquiry is also kept in this browser so you can track it.' : ''}
      </div>

      <div className="card stack" style={{ marginTop: 16 }}>
        <div className="row spread">
          <h3>Send on WhatsApp</h3>
          <span className="small muted">To {CONFIG.phoneDisplay}</span>
        </div>
        <div className="wa-preview">{message}</div>
        <div className="row">
          <a className="btn btn-wa btn-lg grow" href={waLink(message)} target="_blank" rel="noopener noreferrer"><Icon name="whatsapp" size={20} /> Continue on WhatsApp</a>
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
        <div className="row spread" style={{ marginBottom: 10 }}><h3>Progress</h3><StatusBadge status={enq.status} /></div>
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
