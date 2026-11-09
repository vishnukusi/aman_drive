import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useStore } from '../store.js';
import { EstimateBox, Field, StatusBadge } from '../components/ui.jsx';
import { EnquiryDetailsList } from './Confirmation.jsx';
import { fmtDate } from '../lib/whatsapp.js';

export default function Track() {
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
    // Same message for "no such ID" and "wrong digits" so IDs cannot be probed.
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
        Demo note: enquiries are stored in this browser, so only requests made here can be found. A real system would check a server
        record and verify the customer by OTP.
      </p>

      {found && (
        <div className="card stack" style={{ marginTop: 18 }}>
          <div className="row spread">
            <h3>{found.id}</h3>
            <StatusBadge status={found.status} />
          </div>
          {found.status === 'Confirmed' ? (
            <div className="notice ok">The Aman Self Drive team has marked this request as confirmed. Check WhatsApp for pickup details.</div>
          ) : (
            <div className="notice">Status shows what the team has recorded. Please check WhatsApp for the latest from Aman Self Drive.</div>
          )}
          <EnquiryDetailsList enq={found} />
          <EstimateBox est={found.estimate} />
          <h3>Progress</h3>
          <ul className="timeline">
            {found.history.map((h, i) => (
              <li key={i}><strong>{h.label}</strong><div className="small muted">{fmtDate(h.at)}</div></li>
            ))}
          </ul>
        </div>
      )}

      <div style={{ marginTop: 20 }}><Link to="/book" className="btn btn-ghost">Start a new request</Link></div>
    </div>
  );
}
