// WhatsApp communication adapter.
//
// Providers (WHATSAPP_PROVIDER):
//   manual (default) - No WhatsApp Business API. Customer-facing updates are prepared as wa.me links that a staff member opens and
//                      sends from the business phone. Recorded as status 'handoff_link' (NOT "sent"): a link is not a delivery.
//                      Automatic notifications (e.g. "enquiry received") are recorded as 'not_configured'.
//   meta             - Meta WhatsApp Cloud API with approved templates. Requires WHATSAPP_TOKEN, WHATSAPP_PHONE_NUMBER_ID and
//                      template names. Sends only to customers who opted in. Implemented against Meta's documented
//                      /messages endpoint but NOT verified against a live account (no credentials authorised).
//   mock             - Tests / demos: records 'simulated'; nothing leaves the server.

import { CONFIG } from '../src/config.js';

export const TEMPLATES = {
  enquiry_received: {
    title: 'Enquiry received',
    text: (e) => `Hello ${firstName(e)}, your rental enquiry has been received. Reference: ${e.reference}. Our team will review your request and reply here.`,
  },
  details_required: {
    title: 'Details required',
    text: (e, x = {}) => `Hello ${firstName(e)}, we need a few more details to process your rental enquiry ${e.reference}${x.missingText ? `: ${x.missingText}` : ''}. Please reply here or update it on the tracking page.`,
  },
  quote_ready: {
    title: 'Quote ready',
    text: (e) => `Hello ${firstName(e)}, your quote for enquiry ${e.reference} (${e.vehicle_name || 'your car'}) is ready: ₹${Number(e.quote_amount || 0).toLocaleString('en-IN')}. Fuel and tolls are extra. Reply here to go ahead; the booking is confirmed only after document verification.`,
  },
  status_update: {
    title: 'Status update',
    text: (e, x = {}) => `Hello ${firstName(e)}, your enquiry ${e.reference} status is now: ${x.statusLabel || e.status}.`,
  },
};

const firstName = (e) => String(e.customer_name || '').split(' ')[0] || 'there';

export function providerName(env = process.env) {
  const p = (env.WHATSAPP_PROVIDER || 'manual').toLowerCase();
  if (p === 'meta' && !(env.WHATSAPP_TOKEN && env.WHATSAPP_PHONE_NUMBER_ID)) return 'manual';
  return ['manual', 'meta', 'mock'].includes(p) ? p : 'manual';
}

export const toWaNumber = (mobile) => {
  const d = String(mobile || '').replace(/\D/g, '');
  return d.length === 10 ? `91${d}` : d;
};

/** Customer -> business click-to-chat link (customer presses Send). */
export const customerToBusinessLink = (text) => `https://wa.me/${CONFIG.whatsappNumber}?text=${encodeURIComponent(text)}`;

/**
 * Prepares or sends a template message to the enquiry's customer.
 * Returns a communication record (without ids) for the caller to persist. Never throws for provider errors.
 * `automatic` = triggered by the workflow rather than a staff click.
 */
export async function sendTemplate(enquiry, template, { extra = {}, automatic = false, env = process.env, fetchImpl = globalThis.fetch } = {}) {
  const tpl = TEMPLATES[template];
  if (!tpl) throw new Error(`Unknown template ${template}`);
  const body = tpl.text(enquiry, extra);
  const provider = providerName(env);
  const base = { channel: 'whatsapp', direction: 'outbound', template, body, provider, attempts: 0, providerMessageId: null, error: null, link: null };

  if (provider === 'mock') return { ...base, status: 'simulated' };

  if (provider === 'manual') {
    if (automatic) return { ...base, status: 'not_configured', error: 'WhatsApp Business API is not configured; no automatic message was sent.' };
    return { ...base, status: 'handoff_link', link: `https://wa.me/${toWaNumber(enquiry.customer_mobile)}?text=${encodeURIComponent(body)}` };
  }

  // provider === 'meta'
  if (!enquiry.whatsapp_opt_in) return { ...base, status: 'failed', error: 'Customer has not opted in to WhatsApp updates.' };
  const templateName = env[`WHATSAPP_TEMPLATE_${template.toUpperCase()}`];
  if (!templateName) return { ...base, status: 'failed', error: `No approved template configured (WHATSAPP_TEMPLATE_${template.toUpperCase()}).` };
  const url = `https://graph.facebook.com/${env.WHATSAPP_API_VERSION || 'v21.0'}/${env.WHATSAPP_PHONE_NUMBER_ID}/messages`;
  const payload = {
    messaging_product: 'whatsapp',
    to: toWaNumber(enquiry.customer_mobile),
    type: 'template',
    template: {
      name: templateName,
      language: { code: env.WHATSAPP_TEMPLATE_LANG || 'en' },
      components: [{ type: 'body', parameters: [{ type: 'text', text: firstName(enquiry) }, { type: 'text', text: enquiry.reference }] }],
    },
  };
  let attempts = 0;
  let lastError = null;
  while (attempts < 3) {
    attempts++;
    try {
      const res = await fetchImpl(url, {
        method: 'POST',
        headers: { Authorization: `Bearer ${env.WHATSAPP_TOKEN}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json().catch(() => ({}));
      if (res.ok && json.messages && json.messages[0]) {
        // "sent" = accepted by Meta. Delivery/read receipts arrive later via webhook (not implemented yet).
        return { ...base, status: 'sent', attempts, providerMessageId: json.messages[0].id };
      }
      lastError = (json.error && json.error.message) || `HTTP ${res.status}`;
      if (res.status < 500 && res.status !== 429) break; // client errors are not retried
    } catch (err) {
      lastError = err.message;
    }
    await new Promise((r) => setTimeout(r, 200 * attempts));
  }
  return { ...base, status: 'failed', attempts, error: lastError };
}
