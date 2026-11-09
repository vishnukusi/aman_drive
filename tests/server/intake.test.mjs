// Intake engine (rule-based NLP) unit tests with a fixed clock: Monday 9 Nov 2026, 10:00 IST.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { findDates, findDuration, parseMessage, runIntake, todayIST } from '../../server/intake.js';
import { VEHICLES } from '../../src/data/vehicles.js';

const now = new Date('2026-11-09T04:30:00Z');
const today = todayIST(now);
const ctx = { vehicles: VEHICLES, now };

test('clock is IST', () => assert.equal(today, '2026-11-09'));

test('relative and calendar dates', () => {
  assert.deepEqual(findDates('pickup tomorrow', today).map((d) => d.iso), ['2026-11-10']);
  assert.deepEqual(findDates('from 15 Nov to 18th November', today).map((d) => d.iso), ['2026-11-15', '2026-11-18']);
  assert.deepEqual(findDates('on 20/11/2026', today).map((d) => d.iso), ['2026-11-20']);
  assert.deepEqual(findDates('next friday', today).map((d) => d.iso), ['2026-11-20']);
  assert.deepEqual(findDates('this friday', today).map((d) => d.iso), ['2026-11-13']);
  assert.deepEqual(findDates('this weekend', today).map((d) => d.iso), ['2026-11-14', '2026-11-15']);
  assert.deepEqual(findDates('5 Jan', today).map((d) => d.iso), ['2027-01-05'], 'past date without a year rolls to next year');
  assert.deepEqual(findDates('31 Feb', today), [], 'impossible dates are ignored');
});

test('durations', () => {
  assert.deepEqual(findDuration('for 3 days'), { days: 3 });
  assert.deepEqual(findDuration('a week'), { days: 7 });
  assert.deepEqual(findDuration('two days'), { days: 2 });
  assert.deepEqual(findDuration('12 hours'), { hours: 12 });
});

test('full message extraction', () => {
  const r = parseMessage('Hi, my name is Ravi Kumar. Need a Grand i10 from Hyderabad tomorrow for 2 days, trip to Srisailam. Call 98765 43210', ctx);
  assert.equal(r.found.vehicleId, 'grandi10', 'most specific alias wins over "i10"');
  assert.equal(r.found.city, 'hyderabad');
  assert.equal(r.found.pickupDate, '2026-11-10');
  assert.equal(r.found.returnDate, '2026-11-12');
  assert.equal(r.found.destination, 'Srisailam');
  assert.equal(r.found.mobile, '9876543210');
  assert.equal(r.found.name, 'Ravi Kumar');
});

test('pickup city is preferred over destination city', () => {
  assert.equal(parseMessage('One way from Vijayawada to Hyderabad on 20 Nov', ctx).found.city, 'vijayawada');
});

test('preferences produce catalogue suggestions with published rates only', () => {
  const r = runIntake({ message: 'automatic SUV for 6 people', name: 'A B', mobile: '9876543210' }, ctx);
  assert.equal(r.preferences.category, 'SUV');
  assert.equal(r.preferences.minSeats, 7);
  assert.ok(r.suggestions.every((s) => VEHICLES.find((v) => v.id === s.id).rate24 === s.rate24));
  assert.ok(r.missing.includes('vehicleId'));
  assert.equal(r.complete, false);
});

test('structured fields win over parsed text; estimate uses published rates', () => {
  const r = runIntake({ message: 'Need a Swift tomorrow', vehicleId: 'creta', city: 'vizag', pickupDate: '2026-11-10', returnDate: '2026-11-12', name: 'A B', mobile: '9876543210' }, ctx);
  assert.equal(r.draft.vehicleId, 'creta');
  assert.equal(r.estimate.amount, 6000);
  assert.equal(r.estimate.indicative, true);
  assert.equal(r.complete, true);
  assert.ok(r.guardrails.some((g) => /availability/i.test(g)));
});

test('no availability or confirmation language is ever generated', () => {
  const r = runIntake({ message: 'Is the Fortuner available tomorrow? Please confirm my booking', name: 'A B', mobile: '9876543210' }, ctx);
  const text = JSON.stringify([r.questions, r.knowledge]);
  assert.ok(!/is available|booking (is )?confirmed/i.test(text));
});
