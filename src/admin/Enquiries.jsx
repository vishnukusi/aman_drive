import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useStore } from '../store.js';
import { STATUSES } from '../config.js';
import { StatusBadge, SimBadge } from '../components/ui.jsx';
import { fmtWhen } from '../lib/whatsapp.js';
import { inr } from '../lib/pricing.js';

export default function Enquiries() {
  const { enquiries } = useStore();
  const nav = useNavigate();
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('all');
  const [source, setSource] = useState('all');

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return enquiries
      .filter((e) => status === 'all' || e.status === status)
      .filter((e) => source === 'all' || (source === 'sim' ? e.simulated : !e.simulated))
      .filter((e) => {
        if (!needle) return true;
        return [e.id, e.customer.name, e.customer.mobile, e.vehicleName, e.destination].join(' ').toLowerCase().includes(needle);
      })
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [enquiries, q, status, source]);

  return (
    <div className="stack">
      <h2>Enquiries</h2>
      <div className="card row" style={{ gap: 10 }}>
        <input style={{ maxWidth: 320 }} type="search" placeholder="Search ID, name, mobile, car, destination" aria-label="Search enquiries" value={q} onChange={(e) => setQ(e.target.value)} />
        <select style={{ maxWidth: 260 }} aria-label="Filter by status" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="all">All statuses</option>
          {STATUSES.map((s) => <option key={s}>{s}</option>)}
        </select>
        <select style={{ maxWidth: 200 }} aria-label="Filter by source" value={source} onChange={(e) => setSource(e.target.value)}>
          <option value="all">All sources</option>
          <option value="live">Submitted in demo</option>
          <option value="sim">Simulated only</option>
        </select>
        <span className="small muted" aria-live="polite">{rows.length} shown</span>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Enquiry ID</th><th>Customer</th><th>Mobile</th><th>Vehicle</th><th>Pickup</th><th>Return</th>
              <th>Duration</th><th>Destination</th><th>Estimate</th><th>Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((e) => (
              <tr key={e.id} className="click" tabIndex={0} onClick={() => nav(`/admin/enquiries/${e.id}`)} onKeyDown={(ev) => ev.key === 'Enter' && nav(`/admin/enquiries/${e.id}`)}>
                <td><strong>{e.id}</strong></td>
                <td>{e.customer.name} {e.simulated && <SimBadge />}</td>
                <td>{e.customer.mobile}</td>
                <td>{e.vehicleName}</td>
                <td>{fmtWhen(e.pickup.date, e.pickup.time)}</td>
                <td>{fmtWhen(e.ret.date, e.ret.time)}</td>
                <td>{e.durationLabel}</td>
                <td>{e.destination}</td>
                <td>{e.estimate ? inr(e.estimate.amount) : '—'}</td>
                <td><StatusBadge status={e.status} /></td>
              </tr>
            ))}
            {!rows.length && <tr><td colSpan={10}><div className="empty" style={{ border: 0 }}>No enquiries match.</div></td></tr>}
          </tbody>
        </table>
      </div>
      <p className="small muted">Estimates are indicative figures from published rates, not quotations.</p>
    </div>
  );
}
