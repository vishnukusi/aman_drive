// Browser client for the DriveFlow API (same origin: /api/...).
import { useEffect, useRef, useState } from 'react';

export class ApiFailure extends Error {
  constructor(status, body) {
    super(body?.error?.message || `Request failed (${status})`);
    this.status = status;
    this.code = body?.error?.code;
    this.fields = body?.error?.fields || {};
  }
}

export async function api(path, { method = 'GET', body, signal } = {}) {
  // Relative URL ("api/…") so the app also works when hosted under a sub-path (vite base './').
  const res = await fetch(path.replace(/^\//, ''), {
    method,
    signal,
    credentials: 'same-origin',
    headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  let json = null;
  try { json = await res.json(); } catch { /* non-JSON (e.g. static host 404) */ }
  if (!res.ok || !json) throw new ApiFailure(res.status, json);
  return json;
}

// ---------------------------------------------------------------- backend availability (checked once per page load)
let healthPromise = null;
export function checkHealth() {
  if (!healthPromise) {
    healthPromise = api('/api/health')
      .then((h) => ({ ...h, available: !!h.ok }))
      .catch(() => ({ available: false }));
  }
  return healthPromise;
}

/** { loading, available, demoMode, database, whatsapp, intake } */
export function useBackend() {
  const [state, setState] = useState({ loading: true, available: false });
  useEffect(() => {
    let live = true;
    checkHealth().then((h) => live && setState({ loading: false, ...h }));
    return () => { live = false; };
  }, []);
  return state;
}

/** Runs `fn` now and every `ms` while the tab is visible. Returns a manual refresh function. */
export function usePolling(fn, ms, deps = []) {
  const saved = useRef(fn);
  saved.current = fn;
  useEffect(() => {
    let timer;
    let stopped = false;
    const tick = async () => {
      if (stopped) return;
      if (document.visibilityState === 'visible') {
        try { await saved.current(); } catch { /* shown by caller */ }
      }
      if (!stopped) timer = setTimeout(tick, ms);
    };
    tick();
    const onVis = () => document.visibilityState === 'visible' && saved.current();
    document.addEventListener('visibilitychange', onVis);
    return () => {
      stopped = true;
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [ms, ...deps]); // eslint-disable-line react-hooks/exhaustive-deps
}

export const STATUS_META = {
  RECEIVED: { label: 'Received', tone: 'blue' },
  DETAILS_PENDING: { label: 'Details pending', tone: 'orange' },
  PROCESSING: { label: 'Processing', tone: 'violet' },
  STAFF_REVIEW: { label: 'Staff review', tone: 'amber' },
  QUOTE_READY: { label: 'Quote ready', tone: 'violet' },
  APPROVED: { label: 'Approved', tone: 'blue' },
  REJECTED: { label: 'Not available', tone: 'grey' },
  BOOKING_CONFIRMED: { label: 'Booking confirmed', tone: 'green' },
  CANCELLED: { label: 'Cancelled', tone: 'grey' },
};

/** Timeline stages shown to customers and staff. A stage is "done" only if an event for it really happened. */
export const STAGES = [
  { id: 'received', label: 'Enquiry received', statuses: ['RECEIVED'] },
  { id: 'processing', label: 'Automated intake', statuses: ['PROCESSING', 'DETAILS_PENDING'] },
  { id: 'review', label: 'Staff review', statuses: ['STAFF_REVIEW'] },
  { id: 'quote', label: 'Quote / response', statuses: ['QUOTE_READY'] },
  { id: 'decision', label: 'Final decision', statuses: ['APPROVED', 'REJECTED', 'BOOKING_CONFIRMED', 'CANCELLED'] },
];

export function stagesFrom(statusHistory, current) {
  const seen = new Set(statusHistory);
  const curStage = STAGES.findIndex((s) => s.statuses.includes(current));
  return STAGES.map((s, i) => ({
    ...s,
    state: i === curStage ? 'current' : s.statuses.some((x) => seen.has(x)) && i < curStage ? 'done' : 'todo',
  }));
}

export const fmtWhenIso = (iso) =>
  iso ? new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', hour12: true }) : '—';

export const fmtDay = (d) =>
  d ? new Date(`${d}T00:00:00`).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }) : '—';

export const CITY_LABEL = { vijayawada: 'Vijayawada', hyderabad: 'Hyderabad', vizag: 'Vizag' };
