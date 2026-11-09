import { Link, useNavigate } from 'react-router-dom';
import { api, fmtWhenIso, STATUS_META, CITY_LABEL } from '../api/client.js';
import { LiveDot, useLiveData } from './live.jsx';
import { StatusPill, SourceTag } from './parts.jsx';

const PIPELINE = ['RECEIVED', 'PROCESSING', 'DETAILS_PENDING', 'STAFF_REVIEW', 'QUOTE_READY', 'APPROVED', 'BOOKING_CONFIRMED'];
const SOURCE_LABEL = { 'website-wizard': 'Trip planner', 'website-quick': 'Quick enquiry', 'vehicle-card': 'Car card', 'chat-intake': 'Describe your trip', 'demo-seed': 'Demo seed', staff: 'Staff', website: 'Website' };

export default function Dashboard() {
  const nav = useNavigate();
  const { data, error, lastSync } = useLiveData(async () => {
    const [s, recent] = await Promise.all([api('/api/staff/summary'), api('/api/staff/enquiries?limit=8')]);
    return { s, recent: recent.items };
  });
  if (error && !data) return <div className="notice warn">Could not load the dashboard: {error.message}</div>;
  if (!data) return <div className="muted" role="status">Loading…</div>;
  const { s, recent } = data;
  const cards = [
    { l: 'Total enquiries', n: s.total, sub: `${s.last24h} in the last 24 h${s.demo ? ` · ${s.demo} demo` : ''}` },
    { l: 'New', n: s.cards.newEnquiries, sub: 'Received / processing', tone: 'blue' },
    { l: 'Details pending', n: s.cards.detailsPending, sub: 'Waiting on the customer', tone: 'orange' },
    { l: 'Staff review', n: s.cards.staffReview, sub: 'Needs your action', tone: 'amber', accent: s.cards.staffReview > 0, to: 'STAFF_REVIEW' },
    { l: 'Quote ready', n: s.cards.quoteReady, sub: 'Shared with customer', tone: 'violet', to: 'QUOTE_READY' },
    { l: 'Approved', n: s.cards.approved, sub: 'Verify docs & deposit', tone: 'blue', to: 'APPROVED' },
    { l: 'Bookings confirmed', n: s.cards.confirmed, sub: 'Confirmed by staff', tone: 'green', to: 'BOOKING_CONFIRMED' },
  ];
  const max = Math.max(1, ...PIPELINE.map((k) => s.byStatus[k]));
  const comm = s.communications || {};

  return (
    <div className="ops stack-lg">
      <div className="row spread">
        <div>
          <h1 className="h2">Overview</h1>
          <p className="muted small">Every number comes from the DriveFlow database.</p>
        </div>
        <div className="row"><LiveDot lastSync={lastSync} /><Link className="btn btn-primary btn-sm" to="/admin/enquiries">Open inbox</Link></div>
      </div>

      <div className="kpis">
        {cards.map((c) => (
          <button key={c.l} type="button" className={`kpi${c.accent ? ' accent' : ''}${c.tone ? ` tone-${c.tone}` : ''}`} onClick={() => nav(c.to ? `/admin/enquiries?status=${c.to}` : '/admin/enquiries')}>
            <span className="kpi-n">{c.n}</span>
            <span className="kpi-l">{c.l}</span>
            <span className="kpi-s">{c.sub}</span>
          </button>
        ))}
      </div>

      <div className="ops-grid">
        <section className="panel">
          <h2 className="panel-title">Workflow pipeline</h2>
          <p className="muted small">Received → automated intake → staff review → quote → decision</p>
          <div className="pipeline">
            {PIPELINE.map((k) => (
              <Link key={k} to={`/admin/enquiries?status=${k}`} className="pipe-row">
                <span className="pipe-label">{STATUS_META[k].label}</span>
                <span className="pipe-track"><span className={`pipe-fill tone-${STATUS_META[k].tone}`} style={{ width: `${(s.byStatus[k] / max) * 100}%` }} /></span>
                <span className="pipe-n">{s.byStatus[k]}</span>
              </Link>
            ))}
            <div className="pipe-row muted"><span className="pipe-label">Closed</span><span className="pipe-track" /><span className="pipe-n">{s.cards.closed}</span></div>
          </div>
        </section>
        <section className="panel">
          <h2 className="panel-title">Where enquiries come from</h2>
          <ul className="src-list">
            {Object.entries(s.bySource).sort((a, b) => b[1] - a[1]).map(([k, n]) => (
              <li key={k}><span>{SOURCE_LABEL[k] || k}</span><b>{n}</b></li>
            ))}
            {!Object.keys(s.bySource).length && <li className="muted">No enquiries yet.</li>}
          </ul>
          <h2 className="panel-title" style={{ marginTop: 18 }}>WhatsApp communications</h2>
          <ul className="src-list">
            <li><span>Hand-off links prepared by staff</span><b>{comm.handoff_link || 0}</b></li>
            <li><span>Automatic messages not sent (API not configured)</span><b>{comm.not_configured || 0}</b></li>
            <li><span>Sent through WhatsApp Business API</span><b>{comm.sent || 0}</b></li>
            <li><span>Failed</span><b>{comm.failed || 0}</b></li>
          </ul>
        </section>
      </div>

      <section className="panel">
        <div className="row spread"><h2 className="panel-title">Recent activity</h2><Link to="/admin/enquiries" className="small">View all</Link></div>
        <div className="table-wrap flat">
          <table>
            <thead><tr><th>Reference</th><th>Customer</th><th>Car</th><th>City</th><th>Source</th><th>Status</th><th>Updated</th></tr></thead>
            <tbody>
              {recent.map((e) => (
                <tr key={e.reference} className="click" onClick={() => nav(`/admin/enquiries/${e.reference}`)}>
                  <td><Link to={`/admin/enquiries/${e.reference}`} className="mono ref-link" onClick={(ev) => ev.stopPropagation()}>{e.reference}</Link></td>
                  <td>{e.customer.name} {e.isDemo && <span className="badge sim">Demo</span>}</td>
                  <td>{e.vehicle?.name || <span className="muted">Not chosen</span>}</td>
                  <td>{CITY_LABEL[e.city] || '—'}</td>
                  <td><SourceTag source={e.source} /></td>
                  <td><StatusPill status={e.status} /></td>
                  <td className="muted small">{fmtWhenIso(e.updatedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
