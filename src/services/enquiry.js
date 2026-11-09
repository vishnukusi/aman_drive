// Enquiry service: the single seam between the website and whatever handles enquiries.
//
// Today:   the only channel is a WhatsApp click-to-chat link. The customer sees the prefilled text and presses Send.
// Later:   DriveFlow AI can be added as another channel WITHOUT changing the UI, provided it consumes the same
//          EnquiryDraft and returns the same EnquiryResult. See docs/DRIVEFLOW_INTEGRATION.md.
//
// Rules this module enforces for every channel, including a future AI one:
//   * Prices come only from lib/pricing.js (deterministic, from published rates) and are always marked indicative.
//   * No channel may report a booking as confirmed or a car as available. Only staff can, after review.
//   * Missing information is computed here, deterministically, so an AI layer can ask for it but never invent it.

import { CONFIG } from '../config.js';
import { normalizeMobile, validateQuickEnquiry } from '../lib/validation.js';
import { buildQuickMessage, waLink } from '../lib/whatsapp.js';

/** Canonical enquiry shape shared by the quick sheet, the booking wizard and any future DriveFlow adapter. */
export function createDraft(input = {}, vehicles = []) {
  const vehicle = vehicles.find((v) => v.id === input.vehicleId) || null;
  return {
    vehicleId: input.vehicleId || '',
    vehicleName: vehicle ? vehicle.name : input.vehicleName || '',
    city: input.city || '',
    pickupDate: input.pickupDate || '',
    returnDate: input.returnDate || '',
    destination: (input.destination || '').trim(),
    notes: (input.notes || '').trim(),
    name: (input.name || '').trim(),
    mobile: normalizeMobile(input.mobile) || (input.mobile || '').trim(),
    source: input.source || 'website',
  };
}

/** Field-by-field list of what is still needed. Deterministic; an AI assistant may only phrase the question. */
export const missingFields = (draft, now = new Date()) => validateQuickEnquiry(draft, now);

const channels = {
  /** Default and only active channel. Produces a wa.me URL; nothing is sent until the customer presses Send. */
  'whatsapp-link': {
    live: false,
    submit(draft) {
      const message = buildQuickMessage(draft);
      return { status: 'handoff', channel: 'whatsapp-link', url: waLink(message), message, confirmed: false };
    },
  },
  /** Placeholder for the DriveFlow AI channel. Deliberately refuses until an authorised integration exists. */
  driveflow: {
    live: false,
    submit() {
      throw new Error('DriveFlow is not connected. Enquiries use the WhatsApp link until the client authorises an integration.');
    },
  },
};

export const activeChannel = () => {
  const env = (typeof import.meta !== 'undefined' && import.meta.env) || {};
  return env.VITE_ENQUIRY_CHANNEL === 'driveflow' ? 'driveflow' : 'whatsapp-link';
};

/**
 * Validates and hands the enquiry to the active channel.
 * Returns { ok: false, errors } or { ok: true, result } where result.confirmed is ALWAYS false.
 */
export function submitEnquiry(input, vehicles, { channel = activeChannel(), now = new Date() } = {}) {
  const draft = createDraft(input, vehicles);
  const errors = missingFields(draft, now);
  if (Object.keys(errors).length) return { ok: false, errors, draft };
  const result = channels[channel].submit(draft);
  return { ok: true, draft, result: { ...result, confirmed: false, business: CONFIG.shortName } };
}
