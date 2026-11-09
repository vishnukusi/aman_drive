import { CONFIG } from '../config.js';
import { toDate } from './pricing.js';

export const MODE_LABELS = {
  office: 'Collect from MG Road office',
  home: 'Delivery to my address',
  hotel: 'Delivery to my hotel',
  railway: 'Vijayawada Railway Station',
  airport: 'Gannavaram Airport',
};

export function fmtWhen(date, time) {
  const d = toDate(date, time);
  if (!d) return '—';
  return d.toLocaleString('en-IN', { day: 'numeric', month: 'long', hour: 'numeric', minute: '2-digit', hour12: true });
}

export function fmtDate(iso) {
  return new Date(iso).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true });
}

export function locationText(mode, detail) {
  const base = MODE_LABELS[mode] || mode;
  return detail && detail.trim() ? `${base} (${detail.trim()})` : base;
}

/** Customer -> Aman message, prefilled from a saved enquiry. */
export function buildCustomerMessage(enq) {
  return [
    'Hello Aman Self Drive! I would like to enquire about renting a car.',
    '',
    `Enquiry ID: ${enq.id}`,
    '',
    `Name: ${enq.customer.name}`,
    `Vehicle: ${enq.vehicleName}`,
    `Pickup: ${fmtWhen(enq.pickup.date, enq.pickup.time)}`,
    `Return: ${fmtWhen(enq.ret.date, enq.ret.time)}`,
    `Duration: ${enq.durationLabel}`,
    `Pickup location: ${locationText(enq.pickupMode, enq.pickupDetail)}`,
    `Return location: ${locationText(enq.returnMode, enq.returnDetail)}`,
    `Destination: ${enq.destination}`,
    '',
    'Please confirm availability and the final rental quotation.',
  ].join('\n');
}

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
