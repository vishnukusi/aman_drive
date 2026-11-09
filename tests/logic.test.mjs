// Run with: npm test
import assert from 'node:assert/strict';
import { durationHours, formatDuration, estimate } from '../src/lib/pricing.js';
import { normalizeMobile, validateStep } from '../src/lib/validation.js';
import { buildCustomerMessage, waLink } from '../src/lib/whatsapp.js';
import { VEHICLES } from '../src/data/vehicles.js';
import { buildSeedEnquiries } from '../src/data/seedEnquiries.js';

const car = (id) => VEHICLES.find((v) => v.id === id);
let passed = 0;
const t = (name, fn) => {
  fn();
  passed++;
  console.log('  ✓', name);
};

console.log('Duration');
t('2 days exactly', () => assert.equal(durationHours('2026-11-05', '09:00', '2026-11-07', '09:00'), 48));
t('formats days/hours', () => assert.equal(formatDuration(54), '2 days 6 hrs'));
t('invalid input gives null', () => assert.equal(durationHours('', '09:00', '2026-11-07', '09:00'), null));

console.log('Estimate (rates from amanselfdrivecars.com)');
t('Swift 2 days = 2 x 2500', () => assert.equal(estimate(car('swift'), 48).amount, 5000));
t('Creta 6 hrs uses the printed 12-hr rate (2000)', () => assert.equal(estimate(car('creta'), 6).amount, 2000));
t('Swift 6 hrs falls back to 24-hr rate with a note', () => {
  const e = estimate(car('swift'), 6);
  assert.equal(e.amount, 2500);
  assert.ok(e.notes.length === 1);
});
t('Swift 30 hrs = 2500 + min(2500, 6 x 400)', () => assert.equal(estimate(car('swift'), 30).amount, 4900));
t('Swift 47 hrs caps overrun at another 24-hr slot', () => assert.equal(estimate(car('swift'), 47).amount, 5000));
t('Tigor 25 hrs (no extra-hour listed) takes another 24-hr slot', () => assert.equal(estimate(car('tigor'), 25).amount, 3000));
t('Thar 14 hrs = 12-hr 3000 + 2 x 400', () => assert.equal(estimate(car('thar'), 14).amount, 3800));
t('zero / negative hours give null', () => {
  assert.equal(estimate(car('swift'), 0), null);
  assert.equal(estimate(car('swift'), -3), null);
});

console.log('Validation');
t('mobile formats', () => {
  assert.equal(normalizeMobile('+91 98765 43210'), '9876543210');
  assert.equal(normalizeMobile('09876543210'), '9876543210');
  assert.equal(normalizeMobile('12345'), null);
  assert.equal(normalizeMobile('5876543210'), null);
});
const now = new Date('2026-11-01T08:00:00');
const base = { pickupDate: '2026-11-05', pickupTime: '09:00', returnDate: '2026-11-07', returnTime: '09:00' };
t('valid dates pass', () => assert.deepEqual(validateStep(1, base, now), {}));
t('return before pickup is rejected', () =>
  assert.ok(validateStep(1, { ...base, returnDate: '2026-11-04' }, now).returnDate));
t('pickup in the past is rejected', () =>
  assert.ok(validateStep(1, { ...base, pickupDate: '2026-10-20' }, now).pickupDate));
t('same instant is rejected', () =>
  assert.ok(validateStep(1, { ...base, returnDate: '2026-11-05' }, now).returnDate));
t('customer step requires name + mobile', () => {
  const e = validateStep(4, { name: '', mobile: '123', email: 'bad' }, now);
  assert.ok(e.name && e.mobile && e.email);
});
t('email is optional', () => assert.deepEqual(validateStep(4, { name: 'Ravi K', mobile: '9876543210', email: '' }, now), {}));

console.log('WhatsApp');
t('message includes every required field', () => {
  const enq = {
    id: 'DF-1001',
    customer: { name: 'Rahul', mobile: '9876543210' },
    vehicleName: 'Hyundai Creta',
    pickup: { date: '2026-11-05', time: '09:00' },
    ret: { date: '2026-11-07', time: '09:00' },
    durationLabel: '2 days',
    pickupMode: 'office',
    pickupDetail: '',
    returnMode: 'office',
    returnDetail: '',
    destination: 'Hyderabad',
  };
  const m = buildCustomerMessage(enq);
  for (const s of ['DF-1001', 'Rahul', 'Hyundai Creta', '5 November', '7 November', '2 days', 'Hyderabad', 'MG Road']) {
    assert.ok(m.includes(s), `missing ${s}`);
  }
});
t('link targets the configured number and encodes text', () => {
  const l = waLink('Hi there\nline2');
  assert.ok(l.startsWith('https://wa.me/919581378999?text='));
  assert.ok(l.includes('%0A'));
});

console.log('Data');
t('catalogue ids are unique and rates positive', () => {
  assert.equal(new Set(VEHICLES.map((v) => v.id)).size, VEHICLES.length);
  assert.ok(VEHICLES.every((v) => v.rate24 > 0));
});
t('seed enquiries are labelled simulated with unique ids', () => {
  const s = buildSeedEnquiries();
  assert.ok(s.every((e) => e.simulated === true));
  assert.equal(new Set(s.map((e) => e.id)).size, s.length);
  assert.ok(s.every((e) => e.estimate && e.estimate.amount > 0));
});

console.log(`\n${passed} tests passed`);
