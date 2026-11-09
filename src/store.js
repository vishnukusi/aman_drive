// Persistent demo store backed by localStorage.
// This is a stand-in for a real database: it lives in the visitor's own browser, so enquiries
// submitted on a phone will NOT appear on a laptop. See README for the production path.

import { useSyncExternalStore } from 'react';
import { VEHICLES } from './data/vehicles.js';
import { buildSeedEnquiries } from './data/seedEnquiries.js';

const KEYS = {
  enquiries: 'driveflow.v1.enquiries',
  vehicles: 'driveflow.v1.vehicles',
  mine: 'driveflow.v1.mine', // ids submitted from this browser (sessionStorage)
  admin: 'driveflow.v1.admin', // demo admin session (sessionStorage)
};

const read = (store, key) => {
  try {
    return JSON.parse(store.getItem(key));
  } catch {
    return null;
  }
};
const write = (store, key, value) => {
  try {
    store.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
};

const ls = () => (typeof localStorage !== 'undefined' ? localStorage : null);
const ss = () => (typeof sessionStorage !== 'undefined' ? sessionStorage : null);

function load() {
  const s = ls();
  let enquiries = s && read(s, KEYS.enquiries);
  let vehicles = s && read(s, KEYS.vehicles);
  if (!Array.isArray(enquiries)) {
    enquiries = buildSeedEnquiries();
    s && write(s, KEYS.enquiries, enquiries);
  }
  if (!Array.isArray(vehicles)) {
    vehicles = VEHICLES;
    s && write(s, KEYS.vehicles, vehicles);
  }
  return { enquiries, vehicles };
}

let state = load();
const listeners = new Set();

function commit(next) {
  state = { ...state, ...next };
  const s = ls();
  let ok = true;
  if (s) {
    if (next.enquiries) ok = write(s, KEYS.enquiries, state.enquiries) && ok;
    if (next.vehicles) ok = write(s, KEYS.vehicles, state.vehicles) && ok;
  }
  listeners.forEach((l) => l());
  return ok;
}

if (typeof window !== 'undefined') {
  // Keep two open tabs (customer + admin) in sync.
  window.addEventListener('storage', (e) => {
    if (e.key === KEYS.enquiries || e.key === KEYS.vehicles) {
      state = load();
      listeners.forEach((l) => l());
    }
  });
}

const subscribe = (l) => {
  listeners.add(l);
  return () => listeners.delete(l);
};
const getSnapshot = () => state;

export const useStore = () => useSyncExternalStore(subscribe, getSnapshot);

// ---------- Enquiries ----------
export function nextEnquiryId() {
  const nums = state.enquiries
    .map((e) => Number(String(e.id).replace(/\D/g, '')))
    .filter((n) => Number.isFinite(n));
  return `DF-${Math.max(1000, ...nums) + 1}`;
}

export function addEnquiry(data) {
  const now = new Date().toISOString();
  const enquiry = {
    ...data,
    id: nextEnquiryId(),
    simulated: false,
    createdAt: now,
    status: 'New Enquiry',
    adminNotes: '',
    history: [{ at: now, by: 'customer', label: 'Enquiry submitted through DriveFlow' }],
  };
  const ok = commit({ enquiries: [enquiry, ...state.enquiries] });
  if (!ok) throw new Error('Could not save the enquiry in this browser (storage is full or blocked).');
  const s = ss();
  if (s) write(s, KEYS.mine, [...(read(s, KEYS.mine) || []), enquiry.id]);
  return enquiry;
}

export const getEnquiry = (id) => state.enquiries.find((e) => e.id === id) || null;

export const isMine = (id) => {
  const s = ss();
  return !!s && (read(s, KEYS.mine) || []).includes(id);
};

export function setStatus(id, status) {
  const now = new Date().toISOString();
  commit({
    enquiries: state.enquiries.map((e) =>
      e.id === id && e.status !== status
        ? { ...e, status, history: [...e.history, { at: now, by: 'staff', label: `Status changed to ${status}` }] }
        : e,
    ),
  });
}

export function saveAdminNotes(id, adminNotes) {
  const now = new Date().toISOString();
  commit({
    enquiries: state.enquiries.map((e) =>
      e.id === id ? { ...e, adminNotes, history: [...e.history, { at: now, by: 'staff', label: 'Internal note updated' }] } : e,
    ),
  });
}

// ---------- Vehicles ----------
export function saveVehicle(vehicle) {
  const exists = state.vehicles.some((x) => x.id === vehicle.id);
  commit({
    vehicles: exists
      ? state.vehicles.map((x) => (x.id === vehicle.id ? { ...x, ...vehicle } : x))
      : [...state.vehicles, vehicle],
  });
}

export function toggleVehicle(id) {
  commit({ vehicles: state.vehicles.map((x) => (x.id === id ? { ...x, visible: !x.visible } : x)) });
}

export function removeVehicle(id) {
  commit({ vehicles: state.vehicles.filter((x) => x.id !== id) });
}

// ---------- Demo housekeeping ----------
export function resetDemoData() {
  commit({ enquiries: buildSeedEnquiries(), vehicles: VEHICLES });
  const s = ss();
  s && s.removeItem(KEYS.mine);
}

// ---------- Demo admin gate (client-side only, NOT secure) ----------
export const isAdminSession = () => {
  const s = ss();
  return !!s && s.getItem(KEYS.admin) === '1';
};
export const setAdminSession = (on) => {
  const s = ss();
  if (!s) return;
  on ? s.setItem(KEYS.admin, '1') : s.removeItem(KEYS.admin);
};
