// Business settings. Everything here is overridable through VITE_* environment variables.
const env = (typeof import.meta !== 'undefined' && import.meta.env) || {};

export const CONFIG = {
  businessName: 'Aman Self Drive Car Rentals',
  shortName: 'Aman Self Drive',
  // Verified against https://amanselfdrivecars.com/ (30 Oct 2026).
  whatsappNumber: String(env.VITE_WHATSAPP_NUMBER || '919581378999').replace(/\D/g, ''),
  phoneDisplay: env.VITE_PHONE_DISPLAY || '+91 95813 78999',
  websiteUrl: 'https://amanselfdrivecars.com/',
  address: 'MG Rd, Revenue Colony Park, Sidhartha Nagar, Labbipet, Vijayawada, Andhra Pradesh 520010',
  mapsUrl: 'https://maps.app.goo.gl/fo599o2rQY3Srcfw7',
  defaultCity: 'Vijayawada',
  deliveryEnabled: env.VITE_DELIVERY_ENABLED !== 'false',
  ratesCheckedOn: '30 Oct 2026',
  // Demo-only admin gate. Replace with real authentication in production.
  adminUser: env.VITE_ADMIN_USER || 'admin',
  adminPass: env.VITE_ADMIN_PASS || 'driveflow',
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
