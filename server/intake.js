// DriveFlow intake engine: turns a free-text or structured rental request into a validated enquiry draft.
//
// This is RULE-BASED natural-language extraction (no LLM is connected). Every field it extracts is then checked by the same
// deterministic validation as the website form. It never sets prices or availability:
//   * indicative estimates come only from src/lib/pricing.js (published rates);
//   * availability is always "to be confirmed by staff".
// An LLM adapter can later replace parseMessage() for better recall, but its output must pass validateDraft() unchanged.

import { CITIES, DOCUMENTS } from '../src/data/business.js';
import { durationHours, estimate, formatDuration } from '../src/lib/pricing.js';
import { normalizeMobile, isEmail } from '../src/lib/validation.js';

export const ENGINE = { name: 'DriveFlow intake', version: '1.0', kind: 'rule-based', llm: false };

const CITY_WORDS = {
  vijayawada: ['vijayawada', 'bezawada', 'vja', 'gannavaram', 'benz circle', 'labbipet'],
  hyderabad: ['hyderabad', 'hyd', 'kukatpally', 'kphb', 'secunderabad', 'hitec city', 'miyapur'],
  vizag: ['vizag', 'visakhapatnam', 'vishakhapatnam', 'vskp', 'visakha'],
};

const VEHICLE_ALIASES = {
  swift: ['swift'], dzire: ['dzire', 'desire', 'swift dzire'], i20: ['i20', 'i 20'], baleno: ['baleno'], glanza: ['glanza'],
  exter: ['exter'], punch: ['punch'], wagonr: ['wagon r', 'wagonr', 'wagon-r'], tigor: ['tigor'], grandi10: ['grand i10', 'i10'],
  creta: ['creta'], venue: ['venue'], brezza: ['brezza'], grandvitara: ['grand vitara', 'vitara'], ertiga: ['ertiga'],
  marazzo: ['marazzo'], carens: ['carens'], xuv500: ['xuv 500', 'xuv500', 'xuv'], innova: ['innova', 'crysta'], seltos: ['seltos'],
  thar: ['thar'], fortuner: ['fortuner'],
};

const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
const WEEKDAYS = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
const NUM_WORDS = { one: 1, two: 2, three: 3, four: 4, five: 5, six: 6, seven: 7, eight: 8, nine: 9, ten: 10, a: 1, an: 1 };

// ---------------------------------------------------------------- dates (India Standard Time)
const IST_OFFSET_MIN = 330;
export function todayIST(now = new Date()) {
  return new Date(now.getTime() + IST_OFFSET_MIN * 60000).toISOString().slice(0, 10);
}
const addDays = (iso, n) => {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};
const weekdayOf = (iso) => new Date(`${iso}T00:00:00Z`).getUTCDay();
const pad = (n) => String(n).padStart(2, '0');

function makeDate(day, monthIdx, year, today) {
  let y = year ?? Number(today.slice(0, 4));
  const iso = `${y}-${pad(monthIdx + 1)}-${pad(day)}`;
  const d = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(d.getTime()) || d.getUTCDate() !== day) return null;
  // A date without a year that is already past means next year (e.g. "5 Jan" asked in November).
  if (year == null && iso < today) return makeDate(day, monthIdx, y + 1, today);
  return iso;
}

/** Finds date expressions in order of appearance. Returns [{ iso, index }]. */
export function findDates(text, today) {
  const t = text.toLowerCase();
  const out = [];
  const push = (iso, index) => iso && out.push({ iso, index });
  let m;
  const isoRe = /\b(20\d{2})-(\d{1,2})-(\d{1,2})\b/g;
  while ((m = isoRe.exec(t))) push(makeDate(+m[3], +m[2] - 1, +m[1], today), m.index);
  const dmy = /\b(\d{1,2})[/.-](\d{1,2})(?:[/.-](\d{2,4}))?\b/g;
  while ((m = dmy.exec(t))) {
    if (/\d{4}-$/.test(t.slice(Math.max(0, m.index - 5), m.index))) continue;
    const y = m[3] ? (m[3].length === 2 ? 2000 + +m[3] : +m[3]) : null;
    push(makeDate(+m[1], +m[2] - 1, y, today), m.index);
  }
  const dMon = /\b(\d{1,2})(?:st|nd|rd|th)?\s*(?:of\s+)?(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?(?:,?\s*(20\d{2}))?/g;
  while ((m = dMon.exec(t))) push(makeDate(+m[1], MONTHS.indexOf(m[2]), m[3] ? +m[3] : null, today), m.index);
  const monD = /\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+(\d{1,2})(?:st|nd|rd|th)?\b(?:,?\s*(20\d{2}))?/g;
  while ((m = monD.exec(t))) push(makeDate(+m[2], MONTHS.indexOf(m[1]), m[3] ? +m[3] : null, today), m.index);
  const rel = /\b(day after tomorrow|tomorrow|today|tonight)\b/g;
  while ((m = rel.exec(t))) push(addDays(today, m[1] === 'day after tomorrow' ? 2 : m[1] === 'tomorrow' ? 1 : 0), m.index);
  const wd = /\b(?:(this|next|coming)\s+)?(sunday|monday|tuesday|wednesday|thursday|friday|saturday)\b/g;
  while ((m = wd.exec(t))) {
    const target = WEEKDAYS.indexOf(m[2]);
    let diff = (target - weekdayOf(today) + 7) % 7;
    if (diff === 0) diff = 7;
    if (m[1] === 'next' && diff < 7) diff += 7;
    push(addDays(today, diff), m.index);
  }
  const wknd = /\b(this|next|coming)?\s*weekend\b/g;
  while ((m = wknd.exec(t))) {
    let diff = (6 - weekdayOf(today) + 7) % 7;
    if (m[1] === 'next') diff += 7;
    push(addDays(today, diff), m.index);
    out.push({ iso: addDays(today, diff + 1), index: m.index + 0.5, weekendEnd: true });
  }
  // de-duplicate overlapping matches (e.g. "15/11" also matched by another rule), keep order
  return out
    .sort((a, b) => a.index - b.index)
    .filter((d, i, arr) => i === 0 || !(Math.abs(d.index - arr[i - 1].index) < 3 && d.iso === arr[i - 1].iso));
}

export function findDuration(text) {
  const t = text.toLowerCase();
  const m = t.match(/\b(?:for\s+)?(\d{1,2}|one|two|three|four|five|six|seven|eight|nine|ten|a|an)\s*(day|days|night|nights|week|weeks|hour|hours|hrs?)\b/);
  if (!m) return null;
  const n = /^\d+$/.test(m[1]) ? +m[1] : NUM_WORDS[m[1]];
  if (!n) return null;
  if (/^h/.test(m[2])) return { hours: n };
  if (/^w/.test(m[2])) return { days: n * 7 };
  return { days: n };
}

function findTime(text) {
  const m = text.toLowerCase().match(/\b(\d{1,2})(?::(\d{2}))?\s*(am|pm)\b/);
  if (!m) return null;
  let h = +m[1] % 12;
  if (m[3] === 'pm') h += 12;
  const mm = m[2] ? +m[2] : 0;
  return h < 24 && mm < 60 ? `${pad(h)}:${pad(mm)}` : null;
}

// ---------------------------------------------------------------- other fields
function findCity(t) {
  let best = null;
  for (const [id, words] of Object.entries(CITY_WORDS)) {
    for (const w of words) {
      const i = t.search(new RegExp(`\\b${w}\\b`));
      // Prefer the city mentioned with pickup words ("from", "in", "pickup at"); otherwise the first one mentioned.
      if (i >= 0) {
        const before = t.slice(Math.max(0, i - 14), i);
        const score = (/(from|in|at|pick ?up)\s*$/.test(before) ? 0 : 1000) + i;
        if (!best || score < best.score) best = { id, score };
      }
    }
  }
  return best ? best.id : null;
}

function findVehicle(t, vehicles) {
  const hits = [];
  for (const [id, words] of Object.entries(VEHICLE_ALIASES)) {
    const v = vehicles.find((x) => x.id === id);
    if (!v) continue;
    for (const w of words) {
      const i = t.search(new RegExp(`\\b${w.replace(/ /g, '\\s*')}\\b`));
      if (i >= 0) hits.push({ id, i, len: w.length });
    }
  }
  if (!hits.length) return null;
  hits.sort((a, b) => b.len - a.len || a.i - b.i); // most specific alias wins ("grand i10" over "i10")
  return hits[0].id;
}

function findPreferences(t) {
  const p = {};
  if (/\b(suv|suvs)\b/.test(t)) p.category = 'SUV';
  else if (/\b(sedan)\b/.test(t)) p.category = 'Sedan';
  else if (/\b(hatchback|small car)\b/.test(t)) p.category = 'Hatchback';
  if (/\b(7|seven)[\s-]?seat(er|s)?\b|\bfamily\b|\bmpv\b/.test(t)) p.minSeats = 7;
  if (/\bautomatic\b|\bauto gear\b|\bno clutch\b/.test(t)) p.transmission = 'automatic';
  if (/\b(cheap|budget|lowest|affordable)\b/.test(t)) p.budget = true;
  const people = t.match(/\b(\d{1,2})\s*(people|persons|members|pax|of us)\b/);
  if (people) p.passengers = +people[1];
  if (p.passengers >= 6 && !p.minSeats) p.minSeats = 7;
  return p;
}

function findDestination(text) {
  const m = text.match(/\b(?:trip to|going to|travel(?:ling)? to|drive to|visit(?:ing)?|heading to|destination[:\s]+)\s+([A-Z][A-Za-z]+(?:\s+[A-Z][A-Za-z]+){0,2})/);
  if (m) return m[1].trim();
  const m2 = text.match(/\bto\s+([A-Z][A-Za-z]+(?:\s+(?:Valley|Hills|Beach|Temple|Dam))?)\b/);
  if (m2 && !/^(Vijayawada|Hyderabad|Vizag|Visakhapatnam)$/i.test(m2[1])) return m2[1];
  return null;
}

function findName(text) {
  const m = text.match(/\b(?:my name is|name is|this is|i am|i'm)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){0,2})/);
  return m ? m[1] : null;
}

/** Suggests catalogue cars that match stated preferences, cheapest first (published rates only). */
export function suggestVehicles(prefs, vehicles, limit = 3) {
  const pool = vehicles.filter((v) => v.visible !== false);
  const match = (p) => (v) =>
    (!p.category || v.category === p.category) &&
    (!p.minSeats || v.seats >= p.minSeats) &&
    (!p.transmission || /automatic|\bat\b/i.test(v.transmission || ''));
  const byPrice = (a, b) => a.rate24 - b.rate24;
  // Exact matches first. If too few, relax only the seat count (often guessed from words like "family"), never the stated type.
  const exact = pool.filter(match(prefs)).sort(byPrice);
  const relaxed = prefs.minSeats ? pool.filter(match({ ...prefs, minSeats: 0 })).sort(byPrice) : [];
  return [...exact, ...relaxed.filter((v) => !exact.includes(v))]
    .slice(0, limit)
    .map((v) => ({ id: v.id, name: v.name, rate24: v.rate24, seats: v.seats, transmission: v.transmission, exact: exact.includes(v) }));
}

/** Free text -> partial draft. Pure function. */
export function parseMessage(message, { vehicles, now = new Date() }) {
  const text = String(message || '').slice(0, 1200);
  const t = text.toLowerCase();
  const today = todayIST(now);
  const found = {};

  const vehicleId = findVehicle(t, vehicles);
  if (vehicleId) found.vehicleId = vehicleId;
  const city = findCity(t);
  if (city) found.city = city;

  const dates = findDates(text, today);
  const dur = findDuration(text);
  if (dates[0]) found.pickupDate = dates[0].iso;
  if (dates[1]) found.returnDate = dates[1].iso;
  else if (dates[0] && dur) found.returnDate = addDays(dates[0].iso, dur.days ?? Math.ceil(dur.hours / 24));
  const time = findTime(text);
  if (time) found.pickupTime = time;

  const mobileMatch = text.match(/(?:\+?91[\s-]?)?[6-9]\d{4}[\s-]?\d{5}\b/);
  if (mobileMatch) found.mobile = normalizeMobile(mobileMatch[0]) || undefined;
  const email = text.match(/[^\s@]+@[^\s@]+\.[a-z]{2,}/i);
  if (email && isEmail(email[0])) found.email = email[0];
  const name = findName(text);
  if (name) found.name = name;
  const dest = findDestination(text);
  if (dest) found.destination = dest;
  if (/\bone[\s-]?way\b/i.test(text)) found.oneWay = true;
  if (/\boutstation\b|\btrip\b|\bdrive to\b/i.test(text) || dest) found.tripType = 'outstation';

  const prefs = findPreferences(t);
  return { found, prefs, duration: dur };
}

// ---------------------------------------------------------------- validation & questions
const QUESTIONS = {
  vehicleId: 'Which car would you like? Tell us a model, or say "SUV", "7-seater" or "automatic" and we will suggest options.',
  city: 'Which city do you want to pick the car up in: Vijayawada, Hyderabad or Vizag?',
  pickupDate: 'What date do you want to pick the car up?',
  returnDate: 'When will you return the car? A date or a duration ("for 3 days") is fine.',
  name: 'What name should the team use for this enquiry?',
  mobile: 'What is your 10-digit mobile number (WhatsApp) so the team can reply?',
};

/**
 * Deterministic validation of a draft. Returns { errors, missing }:
 *   errors  = values that are present but invalid (reject or ask to correct)
 *   missing = values not yet provided (enquiry can still be saved as DETAILS_PENDING once contact details exist)
 */
export function validateDraft(d, { vehicles, now = new Date(), maxDays = 60 }) {
  const errors = {};
  const missing = [];
  const today = todayIST(now);
  if (!d.vehicleId) missing.push('vehicleId');
  else if (!vehicles.some((v) => v.id === d.vehicleId && v.visible !== false)) errors.vehicleId = 'That car is not in the current fleet list.';
  if (!d.city) missing.push('city');
  else if (!CITIES.some((c) => c.id === d.city)) errors.city = 'Choose Vijayawada, Hyderabad or Vizag.';
  const isDate = (s) => /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(new Date(`${s}T00:00:00Z`).getTime());
  if (!d.pickupDate) missing.push('pickupDate');
  else if (!isDate(d.pickupDate)) errors.pickupDate = 'Pickup date is not a valid date.';
  else if (d.pickupDate < today) errors.pickupDate = 'Pickup date cannot be in the past.';
  if (!d.returnDate) missing.push('returnDate');
  else if (!isDate(d.returnDate)) errors.returnDate = 'Return date is not a valid date.';
  else if (d.pickupDate && isDate(d.pickupDate)) {
    if (d.returnDate < d.pickupDate) errors.returnDate = 'Return date must be on or after the pickup date.';
    else if ((new Date(d.returnDate) - new Date(d.pickupDate)) / 864e5 > maxDays) errors.returnDate = `For rentals over ${maxDays} days, please message the team directly.`;
  }
  for (const k of ['pickupTime', 'returnTime']) if (d[k] && !/^([01]\d|2[0-3]):[0-5]\d$/.test(d[k])) errors[k] = 'Use a time like 09:00.';
  if (!d.name || d.name.trim().length < 2) (d.name ? (errors.name = 'Enter your name.') : missing.push('name'));
  if (!d.mobile) missing.push('mobile');
  else if (!normalizeMobile(d.mobile)) errors.mobile = 'Enter a valid 10-digit Indian mobile number.';
  if (d.email && !isEmail(d.email)) errors.email = 'That email address looks incorrect.';
  for (const [k, max] of [['name', 80], ['destination', 120], ['notes', 500], ['pickupDetail', 160], ['returnDetail', 160]]) {
    if (d[k] && String(d[k]).length > max) errors[k] = `Please keep this under ${max} characters.`;
  }
  return { errors, missing };
}

const pick = (src, keys) => Object.fromEntries(keys.filter((k) => src[k] !== undefined && src[k] !== null && src[k] !== '').map((k) => [k, src[k]]));

export const DRAFT_FIELDS = ['vehicleId', 'city', 'pickupDate', 'pickupTime', 'returnDate', 'returnTime', 'pickupMode', 'pickupDetail',
  'returnMode', 'returnDetail', 'tripType', 'destination', 'notes', 'name', 'mobile', 'email'];

/**
 * Full intake: merge structured fields (they win) with what was parsed from the free-text message, validate, and explain.
 * Returns everything the API stores in intake_json and shows to staff.
 */
export function runIntake(input, { vehicles, now = new Date() }) {
  const structured = pick(input || {}, DRAFT_FIELDS);
  for (const k of Object.keys(structured)) if (typeof structured[k] === 'string') structured[k] = structured[k].trim();
  const parsed = input && input.message ? parseMessage(input.message, { vehicles, now }) : { found: {}, prefs: {}, duration: null };
  const draft = { ...parsed.found, ...structured };
  if (draft.mobile) draft.mobile = normalizeMobile(draft.mobile) || draft.mobile;
  if (parsed.found.oneWay && !draft.notes) draft.notes = 'One-way trip requested.';
  const { errors, missing } = validateDraft(draft, { vehicles, now });
  const suggestions = !draft.vehicleId ? suggestVehicles(parsed.prefs, vehicles) : [];
  const vehicle = vehicles.find((v) => v.id === draft.vehicleId) || null;

  let est = null;
  if (vehicle && draft.pickupDate && draft.returnDate && !errors.pickupDate && !errors.returnDate) {
    const hours = durationHours(draft.pickupDate, draft.pickupTime || '09:00', draft.returnDate, draft.returnTime || draft.pickupTime || '09:00');
    const span = hours > 0 ? hours : 24; // same-day dates without times: assume one 24-hr slot for the indication
    const e = estimate(vehicle, span);
    if (e) est = { ...e, hours: span, durationLabel: formatDuration(span), basis: 'published-rates', indicative: true };
  }

  const city = CITIES.find((c) => c.id === draft.city);
  const knowledge = [];
  if (vehicle) knowledge.push(`${vehicle.name}: published rate ₹${vehicle.rate24.toLocaleString('en-IN')} per 24 hrs with 400 km${vehicle.rate12 ? `, ₹${vehicle.rate12.toLocaleString('en-IN')} for 12 hrs / 200 km` : ''}. Fuel and tolls extra.`);
  if (city) knowledge.push(`${city.name} office: ${city.address}.`);
  if (city && city.id === 'vijayawada') knowledge.push('Vijayawada delivery options listed: home, hotel, railway station, Gannavaram Airport, or MG Road office pickup.');
  if (parsed.found.oneWay) knowledge.push('One-way trips between Vijayawada, Hyderabad and Vizag are available on request; charges are confirmed by the team.');
  knowledge.push(`Documents the team will ask for: ${DOCUMENTS.slice(0, 3).join('; ')}.`);

  return {
    engine: ENGINE,
    draft,
    extracted: Object.keys(parsed.found),
    preferences: parsed.prefs,
    errors,
    missing,
    questions: missing.map((k) => ({ field: k, question: QUESTIONS[k] })),
    suggestions,
    estimate: est,
    knowledge,
    complete: missing.length === 0 && Object.keys(errors).length === 0,
    guardrails: ['No availability is claimed: staff confirm it.', 'Prices are indicative, from published rates only.', 'No booking is confirmed automatically.'],
  };
}
