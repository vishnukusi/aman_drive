// Enquiry lifecycle: statuses, allowed transitions and who may perform them.
// This is the single source of truth; the API refuses any transition not listed here.

export const STATUS = {
  RECEIVED: 'RECEIVED',
  DETAILS_PENDING: 'DETAILS_PENDING',
  PROCESSING: 'PROCESSING',
  STAFF_REVIEW: 'STAFF_REVIEW',
  QUOTE_READY: 'QUOTE_READY',
  APPROVED: 'APPROVED',
  REJECTED: 'REJECTED',
  BOOKING_CONFIRMED: 'BOOKING_CONFIRMED',
  CANCELLED: 'CANCELLED',
};

// label: staff-facing · customer: customer-facing · next: what happens next (customer view) · stage: timeline group
export const STATUS_INFO = {
  RECEIVED: { label: 'Received', customer: 'Enquiry received', next: 'DriveFlow is checking your details.', stage: 'received' },
  DETAILS_PENDING: { label: 'Details pending', customer: 'More details needed', next: 'Please add the missing details below so the team can review your request.', stage: 'processing' },
  PROCESSING: { label: 'Processing', customer: 'Being processed', next: 'Your details are being checked automatically.', stage: 'processing' },
  STAFF_REVIEW: { label: 'Staff review', customer: 'With the Aman team', next: 'The Aman Self Drive team is checking availability and pricing for your dates.', stage: 'review' },
  QUOTE_READY: { label: 'Quote ready', customer: 'Quote ready', next: 'Your quote is ready. The team will share it on WhatsApp; reply there to go ahead.', stage: 'quote' },
  APPROVED: { label: 'Approved', customer: 'Approved, awaiting confirmation', next: 'The team will verify your documents and deposit, then confirm the booking.', stage: 'decision' },
  REJECTED: { label: 'Not available', customer: 'Not available', next: 'The team could not offer this request. Message them on WhatsApp for alternatives.', stage: 'decision' },
  BOOKING_CONFIRMED: { label: 'Booking confirmed', customer: 'Booking confirmed', next: 'Your booking is confirmed by the Aman team. Pickup details are shared on WhatsApp.', stage: 'decision' },
  CANCELLED: { label: 'Cancelled', customer: 'Cancelled', next: 'This enquiry was cancelled.', stage: 'decision' },
};

export const TERMINAL = new Set([STATUS.REJECTED, STATUS.CANCELLED]);

// from -> { to: [actors allowed] }
const T = {
  RECEIVED: { PROCESSING: ['system'], CANCELLED: ['staff'] },
  PROCESSING: { STAFF_REVIEW: ['system'], DETAILS_PENDING: ['system'] },
  DETAILS_PENDING: { PROCESSING: ['system', 'customer'], STAFF_REVIEW: ['staff'], CANCELLED: ['staff'] },
  STAFF_REVIEW: { QUOTE_READY: ['staff'], REJECTED: ['staff'], DETAILS_PENDING: ['staff'], CANCELLED: ['staff'] },
  QUOTE_READY: { APPROVED: ['staff'], REJECTED: ['staff'], STAFF_REVIEW: ['staff'], CANCELLED: ['staff'] },
  APPROVED: { BOOKING_CONFIRMED: ['staff'], CANCELLED: ['staff'] },
  BOOKING_CONFIRMED: { CANCELLED: ['staff'] },
  REJECTED: {},
  CANCELLED: {},
};

/** Which roles count as which actor kind. Viewers can read but never change state. */
export const actorKind = (actor) => {
  if (actor === 'system' || String(actor).startsWith('system:')) return 'system';
  if (actor === 'customer') return 'customer';
  return 'staff';
};

export function canTransition(from, to, actor) {
  const allowed = T[from] && T[from][to];
  return !!allowed && allowed.includes(actorKind(actor));
}

export const nextStatusesFor = (from, actor) =>
  Object.keys(T[from] || {}).filter((to) => canTransition(from, to, actor));

/** Extra data a transition needs before it is accepted. Returns an error message or null. */
export function transitionRequirements(to, { quoteAmount, note } = {}) {
  if (to === STATUS.QUOTE_READY && !(Number.isInteger(quoteAmount) && quoteAmount > 0 && quoteAmount < 10_000_000)) {
    return 'Enter the quote amount in rupees (a whole number above 0).';
  }
  if ((to === STATUS.REJECTED || to === STATUS.CANCELLED || to === STATUS.DETAILS_PENDING) && !(note && note.trim().length >= 3)) {
    return 'Add a short note explaining this change.';
  }
  if (to === STATUS.BOOKING_CONFIRMED && !(note && note.trim().length >= 3)) {
    return 'Add a confirmation note (e.g. documents verified, deposit received).';
  }
  return null;
}

export const ALL_STATUSES = Object.keys(STATUS);
