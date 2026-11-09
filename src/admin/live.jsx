// Live data for staff pages: load once, then poll the server's change feed (GET /api/staff/changes?after=seq)
// every few seconds and reload only when something actually changed. One authoritative record: the database.
import { useCallback, useEffect, useRef, useState } from 'react';
import { api, usePolling } from '../api/client.js';

export function useLiveData(loader, deps = [], { interval = 4000 } = {}) {
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [lastSync, setLastSync] = useState(null);
  const seq = useRef(-1);
  const load = useCallback(async () => {
    try {
      setData(await loader());
      setError(null);
      setLastSync(new Date());
    } catch (err) {
      setError(err);
    }
  }, deps); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { seq.current = -1; }, [load]);

  usePolling(async () => {
    const c = await api(`/api/staff/changes?after=${Math.max(seq.current, 0)}`).catch((err) => { setError(err); return null; });
    if (!c) return;
    if (seq.current === -1 || c.seq !== seq.current) {
      seq.current = c.seq;
      await load();
    } else {
      setLastSync(new Date());
    }
  }, interval, [load]);

  return { data, error, reload: load, lastSync };
}

export const LiveDot = ({ lastSync }) => (
  <span className="live-dot" title={lastSync ? `Synced ${lastSync.toLocaleTimeString()}` : 'Connecting'}>
    <i aria-hidden /> Live{lastSync ? ` · ${lastSync.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}` : ''}
  </span>
);
