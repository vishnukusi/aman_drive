import { CONFIG } from '../config.js';
import { toDate } from './pricing.js';

// Handover options. `office` is resolved per city by locationText().
export const MODE_LABELS = {
  office: 'Collect from MG Road office',
  home: 'Delivery to my address',
  hotel: 'Delivery to my hotel',
  railway: 'Vijayawada Railway Station',
  airport: 'Gannavaram Airport',
  discuss: 'Discuss pickup on WhatsApp',
};

export const OFFICE_LABELS = {
  vijayawada: 'Collect from MG Road office, Vijayawada',
  hyderabad: 'Collect from KPHB office, Hyderabad',
  vizag: 'Collect from Ram Nagar office, Vizag',
};

export const CITY_NAMES = { vijayawada: 'Vijayawada', hyderabad: 'Hyderabad', vizag: 'Vizag' };

export function modeLabel(mode, city = 'vijayawada') {
  if (mode === 'office') return OFFICE_LABELS[city] || MODE_LABELS.office;
  return MODE_LABELS[mode] || mode;
}

export function fmtWhen(date, time) {
  const d = toDate(date, time);
  if (!d) return '—';
  return d.toLocaleString('en-IN', { day: 'numeric', month: 'long', hour: 'numeric', minute: '2-digit', hour12: true });
}

export function fmtDay(date) {
  const d = toDate(date, '00:00');
  if (!d) return '—';
  return d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric' });
}

export function fmtDate(iso) {
  return new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true });
}

export function locationText(mode, detail, city) {
  const base = modeLabel(mode, city);
  return detail && detail.trim() ? `${base} (${detail.trim()})` : base;
}

/** Customer -> Aman message, prefilled from a saved enquiry (booking wizard). */
export function buildCustomerMessage(enq) {
  const city = enq.city || 'vijayawada';
  return [
    'Hello Aman Self Drive! I would like to enquire about renting a car.',
    '',
    `Enquiry ID: ${enq.id}`,
    '',
    `Name: ${enq.customer.name}`,
    `Vehicle: ${enq.vehicleName}`,
    `City: ${CITY_NAMES[city] || city}`,
    `Pickup: ${fmtWhen(enq.pickup.date, enq.pickup.time)}`,
    `Return: ${fmtWhen(enq.ret.date, enq.ret.time)}`,
    `Duration: ${enq.durationLabel}`,
    `Pickup location: ${locationText(enq.pickupMode, enq.pickupDetail, city)}`,
    `Return location: ${locationText(enq.returnMode, enq.returnDetail, city)}`,
    `Destination: ${enq.destination}`,
    '',
    'Please confirm availability and the final rental quotation.',
  ].join('\n');
}

/**
 * Customer -> Aman message for the one-tap "Enquire now" sheet and the home-page quick enquiry.
 * Only lines the customer actually filled in are included. Never states a price or availability.
 */
export function buildQuickMessage(q) {
  const lines = ['Hello Aman Self Drive! I would like to enquire about a self drive car.', ''];
  if (q.vehicleName) lines.push(`Vehicle: ${q.vehicleName}`);
  if (q.city) lines.push(`Pickup city: ${CITY_NAMES[q.city] || q.city}`);
  if (q.pickupDate) lines.push(`Pickup date: ${fmtDay(q.pickupDate)}`);
  if (q.returnDate) lines.push(`Return date: ${fmtDay(q.returnDate)}`);
  if (q.destination && q.destination.trim()) lines.push(`Trip destination: ${q.destination.trim()}`);
  if (q.notes && q.notes.trim()) lines.push(`Notes: ${q.notes.trim()}`);
  if (q.name && q.name.trim()) lines.push(`Name: ${q.name.trim()}`);
  if (q.mobile) lines.push(`Mobile: ${q.mobile}`);
  lines.push('', 'Please confirm availability and the final price.');
  return lines.join('\n');
}

/** Short message for a plain "WhatsApp about this car" tap, mirroring the official site's wording. */
export const carGreeting = (vehicleName, city = 'vijayawada') =>
  `Hi, I want to book ${vehicleName} in ${CITY_NAMES[city] || 'Vijayawada'}`;

/** Staff -> customer message, used by the admin "Open WhatsApp conversation" button. */
export function buildStaffMessage(enq) {
  return [
    `Hello ${enq.customer.name}, this is Aman Self Drive regarding your enquiry ${enq.id}.`,
    `Car: ${enq.vehicleName}`,
    `Pickup: ${fmtWhen(enq.pickup.date, enq.pickup.time)} | Return: ${fmtWhen(enq.ret.date, enq.ret.time)}`,
    '',
    'We are reviewing it and will share availability and the final quotation shortly.',
  ].join('\n');
}

export function waLink(text, number = CONFIG.whatsappNumber) {
  const n = String(number).replace(/\D/g, '');
  return `https://wa.me/${n}?text=${encodeURIComponent(text)}`;
}

/** Link to chat with the customer from the staff side (assumes an Indian mobile, 10 digits). */
export function customerChatLink(enq) {
  const m = String(enq.customer.mobile).replace(/\D/g, '');
  const full = m.length === 10 ? '91' + m : m;
  return waLink(buildStaffMessage(enq), full);
}
