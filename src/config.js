// Business settings. Everything here is overridable through VITE_* environment variables.
const env = (typeof import.meta !== 'undefined' && import.meta.env) || {};

export const CONFIG = {
  businessName: 'Aman Self Drive Car Rentals',
  shortName: 'Aman Self Drive',
  // Verified against https://amanselfdrivecars.com/ (re-checked 9 Nov 2026).
  whatsappNumber: String(env.VITE_WHATSAPP_NUMBER || '919581378999').replace(/\D/g, ''),
  phoneDisplay: env.VITE_PHONE_DISPLAY || '+91 95813 78999',
  email: env.VITE_EMAIL || 'keerthikumar007@gmail.com',
  websiteUrl: 'https://amanselfdrivecars.com/',
  address: 'MG Rd, Revenue Colony Park, Sidhartha Nagar, Labbipet, Vijayawada, Andhra Pradesh 520010',
  mapsUrl: 'https://maps.app.goo.gl/fo599o2rQY3Srcfw7',
  social: {
    facebook: 'https://www.facebook.com/vijayawadaselfdrivecars',
    instagram: 'https://www.instagram.com/amanselfdrivecars',
  },
  defaultCity: 'Vijayawada',
  deliveryEnabled: env.VITE_DELIVERY_ENABLED !== 'false',
  ratesCheckedOn: '9 Nov 2026',
  // Preview/demo mode: shows the "preview build" notice, the demo staff-dashboard link and the demo login hint.
  // Set VITE_DEMO_MODE=false only once the client approves this as their live website (audit decision D2).
  demoMode: env.VITE_DEMO_MODE !== 'false',
  maxRentalDays: 60,
};

export const STATUSES = [
  'New Enquiry',
  'Under Review',
  'Quotation Sent',
  'Awaiting Customer Confirmation',
  'Confirmed',
  'Cancelled',
];

export const STATUS_TONE = {
  'New Enquiry': 'blue',
  'Under Review': 'amber',
  'Quotation Sent': 'violet',
  'Awaiting Customer Confirmation': 'orange',
  Confirmed: 'green',
  Cancelled: 'grey',
};
