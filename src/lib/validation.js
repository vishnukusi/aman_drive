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
    if (f.city !== undefined && !['vijayawada', 'hyderabad', 'vizag'].includes(f.city)) e.city = 'Choose a pickup city.';
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

export const CITY_IDS = ['vijayawada', 'hyderabad', 'vizag'];

/**
 * Validates the one-tap enquiry (vehicle card sheet / home quick enquiry). Dates only, no times.
 * Required: name, mobile, vehicle, city, pickup date, return date. Destination and notes are optional.
 */
export function validateQuickEnquiry(q, now = new Date()) {
  const e = {};
  if (!q.vehicleId) e.vehicleId = 'Choose a car.';
  if (!CITY_IDS.includes(q.city)) e.city = 'Choose a pickup city.';
  const today = todayISO(now);
  if (!q.pickupDate) e.pickupDate = 'Choose a pickup date.';
  else if (q.pickupDate < today) e.pickupDate = 'Pickup cannot be in the past.';
  if (!q.returnDate) e.returnDate = 'Choose a return date.';
  else if (q.pickupDate && q.returnDate < q.pickupDate) e.returnDate = 'Return must be on or after the pickup date.';
  else if (q.pickupDate) {
    const days = (toDate(q.returnDate, '00:00') - toDate(q.pickupDate, '00:00')) / 864e5;
    if (days > CONFIG.maxRentalDays) e.returnDate = `For rentals over ${CONFIG.maxRentalDays} days, please message the team directly.`;
  }
  if ((q.name || '').trim().length < 2) e.name = 'Enter your name.';
  if (!normalizeMobile(q.mobile)) e.mobile = 'Enter a valid 10-digit Indian mobile number.';
  if ((q.destination || '').length > 120) e.destination = 'Please keep this under 120 characters.';
  if ((q.notes || '').length > 500) e.notes = 'Please keep notes under 500 characters.';
  return e;
}
