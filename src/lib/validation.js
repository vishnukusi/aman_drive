import { CONFIG } from '../config.js';
import { durationHours, toDate } from './pricing.js';

/** Returns the 10-digit Indian mobile number, or null when invalid. */
export function normalizeMobile(raw) {
  const digits = String(raw || '').replace(/[^\d]/g, '');
  let d = digits;
  if (d.length === 12 && d.startsWith('91')) d = d.slice(2);
  else if (d.length === 11 && d.startsWith('0')) d = d.slice(1);
  return /^[6-9]\d{9}$/.test(d) ? d : null;
}

export const isEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);

export function todayISO(now = new Date()) {
  const off = now.getTimezoneOffset();
  return new Date(now.getTime() - off * 60000).toISOString().slice(0, 10);
}

export function validateStep(step, f, now = new Date()) {
  const e = {};
  if (step === 0) {
    if (!f.vehicleId) e.vehicleId = 'Please choose a car to continue.';
  }
  if (step === 1) {
    if (!f.pickupDate) e.pickupDate = 'Choose a pickup date.';
    if (!f.pickupTime) e.pickupTime = 'Choose a pickup time.';
    if (!f.returnDate) e.returnDate = 'Choose a return date.';
    if (!f.returnTime) e.returnTime = 'Choose a return time.';
    if (!Object.keys(e).length) {
      const pickup = toDate(f.pickupDate, f.pickupTime);
      if (pickup.getTime() < now.getTime() - 5 * 60000) {
        e.pickupDate = 'Pickup cannot be in the past.';
      }
      const hrs = durationHours(f.pickupDate, f.pickupTime, f.returnDate, f.returnTime);
      if (hrs <= 0) e.returnDate = 'Return must be after pickup.';
      else if (hrs < 1) e.returnTime = 'Minimum rental request is 1 hour.';
      else if (hrs > CONFIG.maxRentalDays * 24) {
        e.returnDate = `For rentals over ${CONFIG.maxRentalDays} days, please contact the team directly.`;
      }
    }
  }
  if (step === 2) {
    const needsAddress = (m) => m === 'home' || m === 'hotel';
    if (needsAddress(f.pickupMode) && !f.pickupDetail.trim()) e.pickupDetail = 'Add the pickup address or landmark.';
    if (needsAddress(f.returnMode) && !f.returnDetail.trim()) e.returnDetail = 'Add the return address or landmark.';
  }
  if (step === 3) {
    if (!f.destination.trim()) e.destination = 'Tell us where you plan to travel.';
    else if (f.destination.trim().length < 2) e.destination = 'Destination looks too short.';
  }
  if (step === 4) {
    if (f.name.trim().length < 2) e.name = 'Enter your full name.';
    if (!normalizeMobile(f.mobile)) e.mobile = 'Enter a valid 10-digit Indian mobile number.';
    if (f.email.trim() && !isEmail(f.email.trim())) e.email = 'That email address looks incorrect.';
  }
  return e;
}
