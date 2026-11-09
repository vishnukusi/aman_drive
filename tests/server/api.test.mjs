// Backend tests: real HTTP server + real libSQL database (in memory). Run: npm test
import { after, before, beforeEach, describe, test } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { openDb } from '../../server/db.js';
import { handle, resetForTests } from '../../server/app.js';
import { createEnquiry, transition } from '../../server/service.js';
import { REF_PATTERN, newReference } from '../../server/ids.js';
import { resetRateLimits } from '../../server/security.js';
import { sendTemplate } from '../../server/whatsapp.js';

process.env.DEMO_MODE = 'true';
process.env.DEMO_STAFF_PASSWORD = 'test-password';
delete process.env.WHATSAPP_PROVIDER;

let server;
let base;
let db;

const day = (n) => {
  const d = new Date(Date.now() + 330 * 60000);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

async function call(path, { method = 'GET', body, cookie, contentType = 'application/json' } = {}) {
  const res = await fetch(base + path, {
    method,
    headers: { ...(body !== undefined ? { 'content-type': contentType } : {}), ...(cookie ? { cookie } : {}) },
    body: body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body),
  });
  const json = await res.json();
  return { status: res.status, json, setCookie: res.headers.get('set-cookie') };
}

async function login(username = 'staff') {
  const r = await call('/api/staff/login', { method: 'POST', body: { username, password: 'test-password' } });
  assert.equal(r.status, 200, JSON.stringify(r.json));
  return r.setCookie.split(';')[0];
}

const valid = () => ({ name: 'Test Rahul', mobile: '98765 43210', vehicleId: 'creta', city: 'vijayawada', pickupDate: day(2), returnDate: day(4), destination: 'Araku', whatsappOptIn: true });

before(async () => {
  db = openDb(':memory:');
  await resetForTests(db);
  server = http.createServer((req, res) => handle(req, res)).listen(0);
  await new Promise((r) => server.once('listening', r));
  base = `http://127.0.0.1:${server.address().port}`;
});
after(() => {
  server.close();
  db.client.close();
});
beforeEach(() => resetRateLimits());

describe('tracking references', () => {
  test('format is DF- plus 6 unambiguous characters and is random', () => {
    const refs = new Set(Array.from({ length: 2000 }, () => newReference()));
    assert.ok([...refs].every((r) => REF_PATTERN.test(r)));
    assert.ok(refs.size > 1990, 'references should not repeat in a small sample');
  });

  test('database UNIQUE constraint rejects a duplicate reference', async () => {
    const { row } = await createEnquiry(db, valid());
    await assert.rejects(
      db.client.execute({ sql: "INSERT INTO enquiries (tenant_id, reference, access_key_hash, status, source, customer_name, customer_mobile, created_at, updated_at) VALUES ('aman', ?, 'x', 'RECEIVED', 'staff', 'X', '9999999999', 'now', 'now')", args: [row.reference] }),
      /UNIQUE/,
    );
  });

  test('createEnquiry retries on collision and still issues a unique reference', async () => {
    const first = await createEnquiry(db, valid());
    const queue = [first.row.reference, first.row.reference, 'DF-ZZZZ22'];
    const r = await createEnquiry(db, valid(), { refGen: () => queue.shift() || newReference() });
    assert.equal(r.row.reference, 'DF-ZZZZ22');
  });
});

describe('POST /api/enquiries', () => {
  test('persists, generates a reference after commit, and runs the automated pipeline to STAFF_REVIEW', async () => {
    const r = await call('/api/enquiries', { method: 'POST', body: { ...valid(), source: 'website-quick', id: 'DF-HACKED', estimate: { amount: 1 } } });
    assert.equal(r.status, 201);
    assert.match(r.json.reference, REF_PATTERN);
    assert.notEqual(r.json.reference, 'DF-HACKED', 'client-supplied IDs are ignored');
    assert.equal(r.json.enquiry.status, 'STAFF_REVIEW');
    assert.equal(r.json.estimate.amount, 6000, 'server computes the estimate from published rates (2 × ₹3,000)');
    assert.deepEqual(r.json.timeline.map((t) => t.status), ['RECEIVED', 'PROCESSING', 'STAFF_REVIEW']);
    assert.ok(r.json.accessKey.length >= 20);
    const row = (await db.client.execute({ sql: 'SELECT * FROM enquiries WHERE reference = ?', args: [r.json.reference] })).rows[0];
    assert.ok(row, 'row exists in the database');
    assert.notEqual(row.access_key_hash, r.json.accessKey, 'only a hash of the access key is stored');
  });

  test('free-text message is parsed; missing details lead to DETAILS_PENDING with questions', async () => {
    const r = await call('/api/enquiries', { method: 'POST', body: { name: 'Test Priya', mobile: '9123456780', message: 'Looking for a 7 seater in Hyderabad tomorrow' } });
    assert.equal(r.status, 201);
    assert.equal(r.json.enquiry.status, 'DETAILS_PENDING');
    assert.deepEqual(r.json.missing.sort(), ['returnDate', 'vehicleId']);
    assert.ok(r.json.questions.every((q) => q.question.length > 10));
    assert.ok(r.json.suggestions.length > 0 && r.json.suggestions.every((s) => s.seats >= 7));
  });

  test('rejects invalid dates', async () => {
    const past = await call('/api/enquiries', { method: 'POST', body: { ...valid(), pickupDate: day(-2) } });
    assert.equal(past.status, 400);
    assert.ok(past.json.error.fields.pickupDate);
    const backwards = await call('/api/enquiries', { method: 'POST', body: { ...valid(), returnDate: day(1), pickupDate: day(3) } });
    assert.equal(backwards.status, 400);
    assert.ok(backwards.json.error.fields.returnDate);
  });

  test('requires contact details before saving', async () => {
    const r = await call('/api/enquiries', { method: 'POST', body: { vehicleId: 'swift', city: 'vizag' } });
    assert.equal(r.status, 400);
    assert.equal(r.json.error.code, 'contact_required');
    assert.ok(r.json.error.fields.name && r.json.error.fields.mobile);
  });

  test('rejects unknown vehicle and city, bad JSON, wrong content type and huge bodies', async () => {
    const bad = await call('/api/enquiries', { method: 'POST', body: { ...valid(), vehicleId: 'lambo', city: 'goa' } });
    assert.equal(bad.status, 400);
    assert.ok(bad.json.error.fields.vehicleId && bad.json.error.fields.city);
    assert.equal((await call('/api/enquiries', { method: 'POST', body: '{nope' })).status, 400);
    assert.equal((await call('/api/enquiries', { method: 'POST', body: 'a=1', contentType: 'application/x-www-form-urlencoded' })).status, 415);
    assert.equal((await call('/api/enquiries', { method: 'POST', body: { notes: 'x'.repeat(30_000) } })).status, 413);
  });

  test('rate limits bursts of enquiries', async () => {
    let last;
    for (let i = 0; i < 9; i++) last = await call('/api/enquiries', { method: 'POST', body: valid() });
    assert.equal(last.status, 429);
  });
});

describe('customer tracking privacy', () => {
  test('needs the access key or the last 4 digits; shows limited data', async () => {
    const c = await call('/api/enquiries', { method: 'POST', body: valid() });
    const ref = c.json.reference;
    assert.equal((await call(`/api/track/${ref}`)).status, 404, 'reference alone is not enough');
    assert.equal((await call(`/api/track/${ref}?k=wrong`)).status, 404);
    const ok = await call(`/api/track/${ref}?k=${c.json.accessKey}`);
    assert.equal(ok.status, 200);
    assert.equal(ok.json.enquiry.mobileMasked, '******3210');
    assert.equal(ok.json.enquiry.firstName, 'Test');
    const text = JSON.stringify(ok.json);
    assert.ok(!text.includes('9876543210') && !text.includes('Rahul'), 'no full mobile or surname in the customer view');
    const byDigits = await call('/api/track/lookup', { method: 'POST', body: { reference: ref.toLowerCase(), last4: '3210' } });
    assert.equal(byDigits.status, 200);
    const wrong = await call('/api/track/lookup', { method: 'POST', body: { reference: ref, last4: '0000' } });
    assert.equal(wrong.status, 404);
    assert.equal(wrong.json.error.message, (await call('/api/track/lookup', { method: 'POST', body: { reference: 'DF-AAAAAA', last4: '3210' } })).json.error.message, 'same message for unknown ref and wrong digits');
  });

  test('customer can complete missing details, which re-runs the pipeline', async () => {
    const c = await call('/api/enquiries', { method: 'POST', body: { name: 'Test Anil', mobile: '9988776655', message: 'Need a Swift in Vizag' } });
    assert.equal(c.json.enquiry.status, 'DETAILS_PENDING');
    const r = await call(`/api/track/${c.json.reference}/details`, { method: 'POST', body: { k: c.json.accessKey, fields: { pickupDate: day(3), returnDate: day(5), status: 'BOOKING_CONFIRMED' } } });
    assert.equal(r.status, 200, JSON.stringify(r.json));
    assert.equal(r.json.enquiry.status, 'STAFF_REVIEW', 'customer cannot set status; pipeline moves it to staff review');
  });
});

describe('staff authentication and roles', () => {
  test('staff endpoints require a session', async () => {
    assert.equal((await call('/api/staff/enquiries')).status, 401);
    assert.equal((await call('/api/staff/login', { method: 'POST', body: { username: 'staff', password: 'nope' } })).status, 401);
  });

  test('forged or tampered session cookies are rejected', async () => {
    const cookie = await login('viewer');
    const [name, value] = cookie.split('=');
    const [payload, sig] = value.split('.');
    const forged = Buffer.from(JSON.stringify({ ...JSON.parse(Buffer.from(payload, 'base64url')), r: 'admin' })).toString('base64url');
    assert.equal((await call('/api/staff/summary', { cookie: `${name}=${forged}.${sig}` })).status, 401);
  });

  test('cookie is HttpOnly and SameSite=Strict', async () => {
    const r = await call('/api/staff/login', { method: 'POST', body: { username: 'staff', password: 'test-password' } });
    assert.match(r.setCookie, /HttpOnly/);
    assert.match(r.setCookie, /SameSite=Strict/);
  });

  test('viewer can read but cannot change status', async () => {
    const c = await call('/api/enquiries', { method: 'POST', body: valid() });
    const viewer = await login('viewer');
    assert.equal((await call(`/api/staff/enquiries/${c.json.reference}`, { cookie: viewer })).status, 200);
    const t = await call(`/api/staff/enquiries/${c.json.reference}/transition`, { method: 'POST', cookie: viewer, body: { to: 'QUOTE_READY', quoteAmount: 6000 } });
    assert.equal(t.status, 403);
  });
});

describe('workflow state machine and events', () => {
  test('enforces valid transitions, requirements and optimistic concurrency', async () => {
    const c = await call('/api/enquiries', { method: 'POST', body: valid() });
    const ref = c.json.reference;
    const s = await login('staff');
    const skip = await call(`/api/staff/enquiries/${ref}/transition`, { method: 'POST', cookie: s, body: { to: 'BOOKING_CONFIRMED', note: 'skip' } });
    assert.equal(skip.status, 422, 'cannot jump from staff review to confirmed');
    const noAmount = await call(`/api/staff/enquiries/${ref}/transition`, { method: 'POST', cookie: s, body: { to: 'QUOTE_READY' } });
    assert.equal(noAmount.status, 422);
    const detail = await call(`/api/staff/enquiries/${ref}`, { cookie: s });
    const stale = detail.json.version - 1;
    const conflict = await call(`/api/staff/enquiries/${ref}/transition`, { method: 'POST', cookie: s, body: { to: 'QUOTE_READY', quoteAmount: 6000, expectedVersion: stale } });
    assert.equal(conflict.status, 409);
    const q1 = await call(`/api/staff/enquiries/${ref}/transition`, { method: 'POST', cookie: s, body: { to: 'QUOTE_READY', quoteAmount: 6000, expectedVersion: detail.json.version } });
    assert.equal(q1.status, 200);
    assert.equal(q1.json.quoteAmount, 6000);
    const sysOnly = await call(`/api/staff/enquiries/${ref}/transition`, { method: 'POST', cookie: s, body: { to: 'PROCESSING' } });
    assert.equal(sysOnly.status, 422, 'staff cannot perform system-only transitions');
  });

  test('every transition is recorded with previous status, new status, actor, time and note', async () => {
    const c = await call('/api/enquiries', { method: 'POST', body: valid() });
    const ref = c.json.reference;
    const s = await login('staff');
    await call(`/api/staff/enquiries/${ref}/transition`, { method: 'POST', cookie: s, body: { to: 'QUOTE_READY', quoteAmount: 6000, note: 'Two days' } });
    await call(`/api/staff/enquiries/${ref}/transition`, { method: 'POST', cookie: s, body: { to: 'APPROVED' } });
    const d = await call(`/api/staff/enquiries/${ref}/transition`, { method: 'POST', cookie: s, body: { to: 'BOOKING_CONFIRMED', note: 'Docs verified' } });
    const statusEvents = d.json.events.filter((e) => e.type === 'status');
    assert.deepEqual(statusEvents.map((e) => [e.from, e.to]), [['RECEIVED', 'PROCESSING'], ['PROCESSING', 'STAFF_REVIEW'], ['STAFF_REVIEW', 'QUOTE_READY'], ['QUOTE_READY', 'APPROVED'], ['APPROVED', 'BOOKING_CONFIRMED']]);
    assert.ok(statusEvents.every((e) => e.actor && e.at));
    assert.equal(statusEvents.at(-1).actor, 'staff:staff');
    assert.equal(statusEvents.at(-1).note, 'Docs verified');
    assert.ok(statusEvents[0].actor.startsWith('system'));
    assert.deepEqual(d.json.allowedTransitions.map((t) => t.to), ['CANCELLED']);
  });

  test('terminal states accept no further transitions', async () => {
    const { row } = await createEnquiry(db, valid());
    await transition(db, row.reference, 'REJECTED', { actor: 'staff:x', note: 'No cars' });
    await assert.rejects(transition(db, row.reference, 'QUOTE_READY', { actor: 'staff:x', quoteAmount: 10 }), /Cannot move/);
  });
});

describe('dashboard data, search and live sync', () => {
  test('summary counts, search by reference and change feed', async () => {
    const s = await login('staff');
    const before = await call('/api/staff/summary', { cookie: s });
    const seq0 = (await call('/api/staff/changes?after=0', { cookie: s })).json.seq;
    const c = await call('/api/enquiries', { method: 'POST', body: valid() });
    const afterSum = await call('/api/staff/summary', { cookie: s });
    assert.equal(afterSum.json.total, before.json.total + 1);
    assert.equal(afterSum.json.cards.staffReview, before.json.cards.staffReview + 1);
    const changes = await call(`/api/staff/changes?after=${seq0}`, { cookie: s });
    assert.equal(changes.json.changed, true);
    assert.ok(changes.json.seq > seq0);
    const found = await call(`/api/staff/enquiries?q=${c.json.reference.toLowerCase()}`, { cookie: s });
    assert.equal(found.json.total, 1);
    assert.equal(found.json.items[0].reference, c.json.reference);
    const byStatus = await call('/api/staff/enquiries?status=STAFF_REVIEW', { cookie: s });
    assert.ok(byStatus.json.items.every((e) => e.status === 'STAFF_REVIEW'));
  });

  test('demo seed data exists and is labelled', async () => {
    const s = await login('staff');
    const list = await call('/api/staff/enquiries?q=Demo%20Customer', { cookie: s });
    assert.ok(list.json.total >= 5);
    assert.ok(list.json.items.every((e) => e.isDemo));
  });
});

describe('WhatsApp adapter', () => {
  const enq = { reference: 'DF-ABCDEF', customer_name: 'Test Rahul', customer_mobile: '9876543210', status: 'QUOTE_READY', quote_amount: 6000, vehicle_name: 'Hyundai Creta', whatsapp_opt_in: 1 };

  test('manual mode records a hand-off link, never "sent"', async () => {
    const auto = await sendTemplate(enq, 'enquiry_received', { automatic: true, env: {} });
    assert.equal(auto.status, 'not_configured');
    const staffClick = await sendTemplate(enq, 'quote_ready', { env: {} });
    assert.equal(staffClick.status, 'handoff_link');
    assert.ok(staffClick.link.startsWith('https://wa.me/919876543210?text='));
    assert.ok(decodeURIComponent(staffClick.link).includes('DF-ABCDEF'));
  });

  test('meta mode sends a template through a mocked Cloud API and retries server errors', async () => {
    const env = { WHATSAPP_PROVIDER: 'meta', WHATSAPP_TOKEN: 't', WHATSAPP_PHONE_NUMBER_ID: '123', WHATSAPP_TEMPLATE_QUOTE_READY: 'quote_ready_v1' };
    const calls = [];
    const fetchImpl = async (url, opts) => {
      calls.push({ url, body: JSON.parse(opts.body) });
      if (calls.length === 1) return { ok: false, status: 503, json: async () => ({ error: { message: 'busy' } }) };
      return { ok: true, status: 200, json: async () => ({ messages: [{ id: 'wamid.TEST' }] }) };
    };
    const r = await sendTemplate(enq, 'quote_ready', { env, fetchImpl });
    assert.equal(r.status, 'sent');
    assert.equal(r.attempts, 2);
    assert.equal(r.providerMessageId, 'wamid.TEST');
    assert.equal(calls[1].body.to, '919876543210');
    assert.equal(calls[1].body.template.name, 'quote_ready_v1');
  });

  test('meta mode refuses customers without opt-in', async () => {
    const env = { WHATSAPP_PROVIDER: 'meta', WHATSAPP_TOKEN: 't', WHATSAPP_PHONE_NUMBER_ID: '123', WHATSAPP_TEMPLATE_QUOTE_READY: 'q' };
    const r = await sendTemplate({ ...enq, whatsapp_opt_in: 0 }, 'quote_ready', { env, fetchImpl: async () => assert.fail('must not call API') });
    assert.equal(r.status, 'failed');
  });

  test('staff message endpoint records a communication event', async () => {
    const c = await call('/api/enquiries', { method: 'POST', body: valid() });
    const s = await login('staff');
    const m = await call(`/api/staff/enquiries/${c.json.reference}/messages`, { method: 'POST', cookie: s, body: { template: 'status_update' } });
    assert.equal(m.status, 200);
    assert.equal(m.json.communication.status, 'handoff_link');
    assert.ok(m.json.enquiry.communications.some((x) => x.template === 'status_update'));
    assert.ok(m.json.enquiry.events.some((e) => e.type === 'communication'));
  });
});

describe('end-to-end journey', () => {
  test('customer submits -> persisted -> dashboard shows it -> staff updates -> customer sees update', async () => {
    // 1. Customer submits through the public API (as the website does).
    const created = await call('/api/enquiries', { method: 'POST', body: { name: 'Test Journey', mobile: '9876501234', message: 'Need a Thar in Vijayawada from tomorrow for 2 days, trip to Araku', source: 'chat-intake' } });
    assert.equal(created.status, 201);
    const { reference, accessKey } = created.json;
    // 2. Persisted with a unique reference.
    const row = (await db.client.execute({ sql: 'SELECT status, vehicle_id, city, source FROM enquiries WHERE reference = ?', args: [reference] })).rows[0];
    assert.deepEqual([row.status, row.vehicle_id, row.city, row.source], ['STAFF_REVIEW', 'thar', 'vijayawada', 'chat-intake']);
    // 3. Dashboard lists it.
    const s = await login('staff');
    const list = await call(`/api/staff/enquiries?q=${reference}`, { cookie: s });
    assert.equal(list.json.items[0].reference, reference);
    // 4. Staff prepares a quote.
    const detail = await call(`/api/staff/enquiries/${reference}`, { cookie: s });
    const upd = await call(`/api/staff/enquiries/${reference}/transition`, { method: 'POST', cookie: s, body: { to: 'QUOTE_READY', quoteAmount: 10000, note: '2 × ₹5,000', expectedVersion: detail.json.version } });
    assert.equal(upd.status, 200);
    // 5. Customer tracking page reflects it.
    const track = await call(`/api/track/${reference}?k=${accessKey}`);
    assert.equal(track.json.enquiry.status, 'QUOTE_READY');
    assert.equal(track.json.enquiry.quoteAmount, 10000);
    assert.equal(track.json.timeline.at(-1).by, 'Aman Self Drive team');
  });
});
