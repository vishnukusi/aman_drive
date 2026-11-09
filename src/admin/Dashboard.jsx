import { Link, useNavigate } from 'react-router-dom';
import { useStore } from '../store.js';
import { STATUSES } from '../config.js';
import { StatusBadge, SimBadge } from '../components/ui.jsx';
import { fmtDate } from '../lib/whatsapp.js';
import { inr } from '../lib/pricing.js';

export default function Dashboard() {
  const { enquiries } = useStore();
  const nav = useNavigate();
  const count = (s) => enquiries.filter((e) => e.status === s).length;
  const live = enquiries.filter((e) => !e.simulated).length;

  const cards = [
    { l: 'Total enquiries', n: enquiries.length, s: `${live} submitted in this demo` },
    { l: 'New', n: count('New Enquiry'), s: 'Need a first look', accent: count('New Enquiry') > 0 },
    { l: 'Awaiting quotation', n: count('New Enquiry') + count('Under Review'), s: 'New + under review' },
    { l: 'Awaiting customer', n: count('Quotation Sent') + count('Awaiting Customer Confirmation'), s: 'Quoted, waiting on reply' },
    { l: 'Confirmed', n: count('Confirmed'), s: 'Marked by staff' },
    { l: 'Cancelled', n: count('Cancelled'), s: '' },
  ];
  const recent = [...enquiries].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 6);
  const max = Math.max(1, ...STATUSES.map(count));

  return (
    <div className="stack" style={{ '--gap': '18px' }}>
      <div className="row spread">
        <h2>Overview</h2>
        <Link className="btn btn-primary btn-sm" to="/admin/enquiries">Manage enquiries</Link>
      </div>

      <div className="stats">
        {cards.map((c) => (
          <div key={c.l} className={`stat${c.accent ? ' accent' : ''}`}>
            <div className="n">{c.n}</div>
            <div className="l">{c.l}</div>
            <div className="s">{c.s}</div>
          </div>
        ))}
      </div>
      <p className="small muted">Counts include simulated demo enquiries and any you have submitted from the customer site.</p>

      <div className="detail-grid">
        <div className="card">
          <h3 style={{ marginBottom: 12 }}>Latest enquiries</h3>
          <div className="table-wrap" style={{ border: 0 }}>
            <table style={{ minWidth: 560 }}>
              <thead><tr><th>ID</th><th>Customer</th><th>Vehicle</th><th>Estimate</th><th>Status</th></tr></thead>
              <tbody>
                {recent.map((e) => (
                  <tr key={e.id} className="click" onClick={() => nav(`/admin/enquiries/${e.id}`)}>
                    <td><strong>{e.id}</strong></td>
                    <td>{e.customer.name} {e.simulated && <SimBadge />}</td>
                    <td>{e.vehicleName}</td>
                    <td>{e.estimate ? inr(e.estimate.amount) : '—'}</td>
                    <td><StatusBadge status={e.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="small muted" style={{ marginTop: 8 }}>Newest first · last activity {recent[0] ? fmtDate(recent[0].createdAt) : '—'}</p>
        </div>

        <div className="card">
          <h3 style={{ marginBottom: 12 }}>Pipeline</h3>
          <div className="bars">
            {STATUSES.map((s) => (
              <div className="bar" key={s}>
                <span>{s}</span>
                <span className="track"><span className="fill" style={{ width: `${(count(s) / max) * 100}%`, display: 'block' }} /></span>
                <strong>{count(s)}</strong>
              </div>
            ))}
          </div>
          <div className="notice" style={{ marginTop: 16 }}>
            Status changes are made by staff. DriveFlow never confirms a booking automatically.
          </div>
        </div>
      </div>
    </div>
  );
}
