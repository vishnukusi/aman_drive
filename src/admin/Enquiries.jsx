import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { api, CITY_LABEL, fmtDay, fmtWhenIso, STATUS_META } from '../api/client.js';
import { LiveDot, useLiveData } from './live.jsx';
import { SourceTag, StatusPill } from './parts.jsx';

export default function Enquiries() {
  const nav = useNavigate();
  const [params, setParams] = useSearchParams();
  const status = params.get('status') || '';
  const city = params.get('city') || '';
  const qParam = params.get('q') || '';
  const [q, setQ] = useState(qParam);
  useEffect(() => setQ(qParam), [qParam]);

  const { data, error, lastSync } = useLiveData(
    () => api(`/api/staff/enquiries?${new URLSearchParams({ q: qParam, status, city, limit: '100' })}`),
    [qParam, status, city],
  );

  const set = (k, v) => {
    const next = new URLSearchParams(params);
    v ? next.set(k, v) : next.delete(k);
    setParams(next, { replace: true });
  };

  return (
    <div className="ops stack-lg">
      <div className="row spread">
        <div>
          <h1 className="h2">Enquiry inbox</h1>
          <p className="muted small">Search by tracking reference, customer, mobile, car or destination.</p>
        </div>
        <LiveDot lastSync={lastSync} />
      </div>

      <form className="toolbar" onSubmit={(e) => { e.preventDefault(); set('q', q.trim()); }} role="search">
        <input className="search" placeholder="Search e.g. DF-A7K92X, Creta, 3210" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search enquiries" />
        <select value={status} onChange={(e) => set('status', e.target.value)} aria-label="Filter by status">
          <option value="">All statuses</option>
          {Object.entries(STATUS_META).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
        <select value={city} onChange={(e) => set('city', e.target.value)} aria-label="Filter by city">
          <option value="">All cities</option>
          {Object.entries(CITY_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <button className="btn btn-dark btn-sm" type="submit">Search</button>
        {(qParam || status || city) && <button type="button" className="linkish" onClick={() => setParams({}, { replace: true })}>Clear</button>}
      </form>

      {error && !data && <div className="notice warn">{error.message}</div>}
      {data && (
        <>
          <p className="small muted" aria-live="polite">{data.total} enquir{data.total === 1 ? 'y' : 'ies'}</p>
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Reference</th><th>Customer</th><th>Car</th><th>City</th><th>Pickup → return</th><th>Source</th><th>Status</th><th>Created</th><th>Last update</th></tr>
              </thead>
              <tbody>
                {data.items.map((e) => (
                  <tr key={e.reference} className="click" onClick={() => nav(`/admin/enquiries/${e.reference}`)}>
                    <td><Link to={`/admin/enquiries/${e.reference}`} className="mono ref-link" onClick={(ev) => ev.stopPropagation()}>{e.reference}</Link></td>
                    <td>
                      <div>{e.customer.name} {e.isDemo && <span className="badge sim">Demo</span>}</div>
                      <div className="small muted">{e.customer.mobile}</div>
                    </td>
                    <td>{e.vehicle?.name || <span className="muted">Not chosen</span>}</td>
                    <td>{CITY_LABEL[e.city] || <span className="muted">—</span>}</td>
                    <td className="small">{e.pickup.date ? `${fmtDay(e.pickup.date)} → ${fmtDay(e.ret.date)}` : <span className="muted">Dates missing</span>}</td>
                    <td><SourceTag source={e.source} /></td>
                    <td><StatusPill status={e.status} /></td>
                    <td className="small muted">{fmtWhenIso(e.createdAt)}</td>
                    <td className="small muted">{fmtWhenIso(e.updatedAt)}</td>
                  </tr>
                ))}
                {!data.items.length && <tr><td colSpan={9} className="center muted" style={{ padding: 28 }}>No enquiries match.</td></tr>}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
