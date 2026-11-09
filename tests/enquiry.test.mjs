// Run with: npm test
// Covers the upgrade: quick WhatsApp enquiry, enquiry service (DriveFlow seam), city handover, collections, published data.
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { validateQuickEnquiry } from '../src/lib/validation.js';
import { buildCustomerMessage, buildQuickMessage, locationText } from '../src/lib/whatsapp.js';
import { VEHICLES, inCollection, transmissionKind } from '../src/data/vehicles.js';
import { CITIES, REVIEWS, STATS } from '../src/data/business.js';
import { FAQ } from '../src/data/faq.js';
import { submitEnquiry, missingFields } from '../src/services/enquiry.js';

const car = (id) => VEHICLES.find((v) => v.id === id);
let passed = 0;
const t = (name, fn) => {
  fn();
  passed++;
  console.log('  ✓', name);
};
const now = new Date('2026-11-01T08:00:00');
const q = { vehicleId: 'creta', city: 'hyderabad', pickupDate: '2026-11-05', returnDate: '2026-11-07', name: 'Test Rahul', mobile: '98765 43210', destination: 'Srisailam', notes: '' };

console.log('Quick enquiry (one-tap WhatsApp)');
t('valid quick enquiry passes', () => assert.deepEqual(validateQuickEnquiry(q, now), {}));
t('requires car, city, name and mobile', () => {
  const e = validateQuickEnquiry({ pickupDate: '2026-11-05', returnDate: '2026-11-05' }, now);
  for (const k of ['vehicleId', 'city', 'name', 'mobile']) assert.ok(e[k], k);
});
t('same-day return is allowed (dates only)', () => assert.deepEqual(validateQuickEnquiry({ ...q, returnDate: '2026-11-05' }, now), {}));
t('rejects return before pickup and past pickup', () => {
  assert.ok(validateQuickEnquiry({ ...q, returnDate: '2026-11-04' }, now).returnDate);
  assert.ok(validateQuickEnquiry({ ...q, pickupDate: '2026-10-30' }, now).pickupDate);
});
t('rejects unknown city and over-long rentals', () => {
  assert.ok(validateQuickEnquiry({ ...q, city: 'chennai' }, now).city);
  assert.ok(validateQuickEnquiry({ ...q, returnDate: '2027-02-01' }, now).returnDate);
});
t('message has car, city, dates, trip, name and mobile, and states no price', () => {
  const m = buildQuickMessage({ ...q, vehicleName: 'Hyundai Creta', mobile: '9876543210' });
  for (const s of ['Hyundai Creta', 'Hyderabad', '5 November', '7 November', 'Srisailam', 'Test Rahul', '9876543210']) assert.ok(m.includes(s), s);
  assert.ok(!m.includes('₹'));
  assert.ok(m.includes('Please confirm availability'));
});

console.log('Enquiry service (DriveFlow-ready seam)');
t('hands off to WhatsApp and never reports a confirmed booking', () => {
  const r = submitEnquiry(q, VEHICLES, { now });
  assert.equal(r.ok, true);
  assert.equal(r.result.confirmed, false);
  assert.equal(r.result.status, 'handoff');
  assert.ok(r.result.url.startsWith('https://wa.me/919581378999?text='));
  assert.ok(decodeURIComponent(r.result.url).includes('Hyundai Creta'));
});
t('returns field errors instead of a link when incomplete', () => {
  const r = submitEnquiry({ ...q, mobile: '123' }, VEHICLES, { now });
  assert.equal(r.ok, false);
  assert.ok(r.errors.mobile);
  assert.deepEqual(Object.keys(missingFields({ ...q, mobile: '9876543210' }, now)), []);
});
t('DriveFlow channel refuses until an integration is authorised', () => {
  assert.throws(() => submitEnquiry(q, VEHICLES, { now, channel: 'driveflow' }), /not connected/);
});

console.log('City-aware booking');
t('office handover label follows the city', () => {
  assert.ok(locationText('office', '', 'hyderabad').includes('KPHB'));
  assert.ok(locationText('office', '', 'vizag').includes('Ram Nagar'));
  assert.ok(locationText('office', '', undefined).includes('MG Road'));
});
t('wizard message includes the city', () => {
  const m = buildCustomerMessage({
    id: 'DF-1', customer: { name: 'A', mobile: '9876543210' }, vehicleName: 'Swift', city: 'vizag',
    pickup: { date: '2026-11-05', time: '09:00' }, ret: { date: '2026-11-06', time: '09:00' }, durationLabel: '1 day',
    pickupMode: 'office', pickupDetail: '', returnMode: 'office', returnDetail: '', destination: 'Araku',
  });
  assert.ok(m.includes('City: Vizag') && m.includes('Ram Nagar'));
});

console.log('Fleet collections & published data');
t('transmission parsing uses word boundaries', () => {
  assert.deepEqual(transmissionKind({ transmission: 'AT & MT' }), { automatic: true, manual: true });
  assert.deepEqual(transmissionKind({ transmission: 'Automatic' }), { automatic: true, manual: false });
  assert.deepEqual(transmissionKind({ transmission: 'Manual' }), { automatic: false, manual: true });
  assert.deepEqual(transmissionKind({ transmission: null }), { automatic: false, manual: false });
});
t('premium = published rate ≥ ₹4,500', () => {
  const ids = VEHICLES.filter((v) => inCollection(v, 'premium')).map((v) => v.id).sort();
  assert.deepEqual(ids, ['fortuner', 'innova', 'seltos', 'thar', 'xuv500']);
});
t('family = 7 seats', () => {
  const fam = VEHICLES.filter((v) => inCollection(v, 'family'));
  assert.ok(fam.length >= 5 && fam.every((v) => v.seats >= 7));
});
t('published rates unchanged (spot check vs amanselfdrivecars.com, 9 Nov 2026)', () => {
  const r = Object.fromEntries(VEHICLES.map((v) => [v.id, v.rate24]));
  assert.deepEqual([r.wagonr, r.tigor, r.grandi10, r.swift, r.creta, r.venue, r.innova, r.thar, r.fortuner], [1500, 1500, 1800, 2500, 3000, 3500, 4500, 5000, 15000]);
  assert.equal(car('creta').rate12, 2000);
  assert.equal(car('glanza').extraHour, null);
  assert.equal(VEHICLES.length, 22);
});
t('every car has a self-hosted image on disk (480 + 960)', () => {
  for (const v of VEHICLES) {
    assert.ok(existsSync(new URL(`../public/${v.image}`, import.meta.url)), v.image);
    assert.ok(existsSync(new URL(`../public/${v.imageLarge}`, import.meta.url)), v.imageLarge);
  }
});
t('official logo files are present', () => {
  assert.ok(existsSync(new URL('../public/images/brand/aman-logo.png', import.meta.url)));
  assert.ok(existsSync(new URL('../public/images/brand/aman-icon.png', import.meta.url)));
});
t('three cities with address and maps link', () => {
  assert.deepEqual(CITIES.map((c) => c.id), ['vijayawada', 'hyderabad', 'vizag']);
  assert.ok(CITIES.every((c) => c.address && c.mapsUrl.startsWith('https://maps.app.goo.gl/')));
});
t('reviews and stats match what the business publishes', () => {
  assert.equal(REVIEWS.length, 4);
  assert.deepEqual(STATS.map((s) => s.value), [8, 2, 10, 1000]);
});
t('every FAQ answer is attributed to an official page', () => assert.ok(FAQ.every((f) => ['home', 'faq'].includes(f.source) && f.a.length > 20)));

console.log(`\n${passed} tests passed`);
