// DriveFlow API: one framework-free request handler (Node http req/res), used by the dev server and the Vercel function.
import { migrate, openDb, one, q } from './db.js';
import {
  ApiError, TENANT, audit, authoriseCustomer, changesAfter, createEnquiry, customerTimeline, customerView, ensureSeed, getEnquiryFull,
  listEnquiries, listVehicles, requireRow, resetDemo, saveStaffNotes, staffMessage, summary, supplyDetails, transition, updateVehicle,
} from './service.js';
import { runIntake, ENGINE } from './intake.js';
import { CAN, SESSION_COOKIE, clearCookie, issueSession, parseCookies, rateLimit, readSession, sessionCookie, verifyPassword } from './security.js';
import { providerName } from './whatsapp.js';
import { STATUS_INFO } from './workflow.js';

const isDemo = (env = process.env) => env.DEMO_MODE !== 'false';

let ready = null;
let dbRef = null;
/** Lazily opens, migrates and seeds the database once per process (or serverless instance). */
export function getDb(options = {}) {
  if (!options.db && !options.url && process.env.VERCEL && !process.env.DATABASE_URL) {
    // Serverless file systems are read-only/ephemeral: refuse rather than silently lose enquiries.
    return Promise.reject(new ApiError(503, 'not_configured', 'The DriveFlow database is not configured for this deployment.'));
  }
  if (!ready) {
    dbRef = options.db || openDb(options.url);
    ready = (async () => {
      await migrate(dbRef);
      await ensureSeed(dbRef, { demo: isDemo() });
      return dbRef;
    })().catch((err) => {
      ready = null;
      throw err;
    });
  }
  return ready;
}
/** Tests: start over with a fresh database. */
export function resetForTests(db) {
  ready = null;
  dbRef = null;
  return getDb({ db });
}

// ---------------------------------------------------------------- helpers
function send(res, status, body, headers = {}) {
  const json = JSON.stringify(body);
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
    'X-Robots-Tag': 'noindex',
    ...headers,
  });
  res.end(json);
}

async function readJson(req, limit = 20_000) {
  if (req.body && typeof req.body === 'object') return req.body; // Vercel may pre-parse
  const chunks = [];
  let size = 0;
  for await (const c of req) {
    size += c.length;
    if (size > limit) throw new ApiError(413, 'too_large', 'Request body too large.');
    chunks.push(c);
  }
  if (!chunks.length) return {};
  try {
    const v = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    if (!v || typeof v !== 'object' || Array.isArray(v)) throw new Error('not an object');
    return v;
  } catch {
    throw new ApiError(400, 'bad_json', 'Request body must be a JSON object.');
  }
}

const clientIp = (req) => String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown').split(',')[0].trim();

function limit(req, name, max, windowMs) {
  const r = rateLimit(`${name}:${clientIp(req)}`, max, windowMs);
  if (!r.ok) throw new ApiError(429, 'rate_limited', `Too many requests. Try again in ${r.retryAfter} seconds.`);
}

function staff(req, perm = 'read') {
  const s = readSession(parseCookies(req.headers.cookie)[SESSION_COOKIE]);
  if (!s || s.t !== TENANT) throw new ApiError(401, 'unauthenticated', 'Please sign in.');
  if (!CAN[perm].includes(s.r)) throw new ApiError(403, 'forbidden', 'Your role cannot do this.');
  return s;
}

function requireJson(req) {
  // Blocks cross-site form posts: browsers cannot send application/json cross-origin without a CORS preflight, which we never allow.
  if (!String(req.headers['content-type'] || '').startsWith('application/json')) throw new ApiError(415, 'json_required', 'Use Content-Type: application/json.');
}

// ---------------------------------------------------------------- routes
const routes = [];
const route = (method, pattern, fn) => routes.push({ method, re: new RegExp(`^${pattern.replace(/:(\w+)/g, '(?<$1>[^/]+)')}$`), fn });

route('GET', '/api/health', async ({ db }) => ({
  ok: true,
  database: db.kind,
  demoMode: isDemo(),
  intake: ENGINE,
  whatsapp: providerName(),
  time: new Date().toISOString(),
}));

route('GET', '/api/vehicles', async ({ db }) => ({ items: await listVehicles(db) }));

// Preview what the automated intake understands, without saving anything.
route('POST', '/api/intake/preview', async ({ db, req, body }) => {
  limit(req, 'intake', 60, 60_000);
  const vehicles = await listVehicles(db);
  const r = runIntake(body, { vehicles });
  return { draft: r.draft, extracted: r.extracted, preferences: r.preferences, missing: r.missing, questions: r.questions, errors: r.errors, suggestions: r.suggestions, estimate: r.estimate, knowledge: r.knowledge, complete: r.complete, engine: r.engine, guardrails: r.guardrails };
});

route('POST', '/api/enquiries', async ({ db, req, body }) => {
  limit(req, 'enquiry', 8, 10 * 60_000);
  const { row, accessKey, intake } = await createEnquiry(db, body, { source: body.source, ip: clientIp(req) });
  return {
    _status: 201,
    reference: row.reference,
    accessKey, // shown to the customer once; only its hash is stored
    trackPath: `/track/${row.reference}?k=${accessKey}`,
    enquiry: customerView(row),
    timeline: await customerTimeline(db, row),
    missing: intake.missing,
    questions: intake.questions,
    suggestions: intake.suggestions,
    estimate: intake.estimate,
  };
});

route('GET', '/api/track/:ref', async ({ db, req, params, query }) => {
  limit(req, 'track', 120, 60_000);
  const row = await authoriseCustomer(db, params.ref, { key: query.get('k'), last4: query.get('last4') });
  return { enquiry: customerView(row), timeline: await customerTimeline(db, row) };
});

route('POST', '/api/track/lookup', async ({ db, req, body }) => {
  limit(req, 'track-lookup', 10, 10 * 60_000);
  const row = await authoriseCustomer(db, body.reference, { last4: String(body.last4 || '').replace(/\D/g, '') });
  return { enquiry: customerView(row), timeline: await customerTimeline(db, row) };
});

route('POST', '/api/track/:ref/details', async ({ db, req, params, body }) => {
  limit(req, 'details', 20, 10 * 60_000);
  const row = await authoriseCustomer(db, params.ref, { key: body.k, last4: body.last4 });
  const r = await supplyDetails(db, row, body.fields);
  return { enquiry: customerView(r.row), timeline: await customerTimeline(db, r.row), missing: r.intake.missing };
});

// ---- staff
route('POST', '/api/staff/login', async ({ db, req, body }) => {
  limit(req, 'login', 10, 15 * 60_000);
  const user = await one(db, 'SELECT * FROM staff_users WHERE tenant_id = ? AND username = ?', [TENANT, String(body.username || '').trim().toLowerCase()]);
  if (!user || !verifyPassword(body.password, user.password_hash)) {
    await audit(db, String(body.username || '?').slice(0, 40), 'login.failed', null, clientIp(req));
    throw new ApiError(401, 'bad_credentials', 'Incorrect username or password.');
  }
  await audit(db, user.username, 'login', null, clientIp(req));
  const secure = String(req.headers['x-forwarded-proto'] || '').includes('https');
  return { _headers: { 'Set-Cookie': sessionCookie(issueSession(user), { secure }) }, user: { username: user.username, name: user.display_name, role: user.role } };
});

route('POST', '/api/staff/logout', async () => ({ _headers: { 'Set-Cookie': clearCookie() }, ok: true }));

route('GET', '/api/staff/me', async ({ req }) => {
  const s = staff(req);
  return { user: { username: s.u, name: s.n, role: s.r }, demoMode: isDemo(), whatsapp: providerName(), intake: ENGINE };
});

route('GET', '/api/staff/summary', async ({ db, req }) => { staff(req); return summary(db); });

route('GET', '/api/staff/enquiries', async ({ db, req, query }) => {
  staff(req);
  return listEnquiries(db, { q: query.get('q') || '', status: query.get('status') || '', city: query.get('city') || '', limit: query.get('limit'), offset: query.get('offset') });
});

route('GET', '/api/staff/enquiries/:ref', async ({ db, req, params }) => {
  const s = staff(req);
  return getEnquiryFull(db, params.ref, s.r);
});

route('POST', '/api/staff/enquiries/:ref/transition', async ({ db, req, params, body }) => {
  const s = staff(req, 'write');
  const quoteAmount = body.quoteAmount === undefined || body.quoteAmount === '' ? undefined : Number(body.quoteAmount);
  await transition(db, params.ref, String(body.to || ''), { actor: `staff:${s.u}`, note: String(body.note || '').slice(0, 500), quoteAmount, expectedVersion: body.expectedVersion });
  return getEnquiryFull(db, params.ref, s.r);
});

route('POST', '/api/staff/enquiries/:ref/notes', async ({ db, req, params, body }) => {
  const s = staff(req, 'write');
  await saveStaffNotes(db, params.ref, body.notes, `staff:${s.u}`);
  return getEnquiryFull(db, params.ref, s.r);
});

route('POST', '/api/staff/enquiries/:ref/messages', async ({ db, req, params, body }) => {
  const s = staff(req, 'write');
  const comm = await staffMessage(db, params.ref, String(body.template || ''), `staff:${s.u}`);
  return { communication: comm, enquiry: await getEnquiryFull(db, params.ref, s.r) };
});

route('GET', '/api/staff/changes', async ({ db, req, query }) => {
  staff(req);
  return changesAfter(db, query.get('after'));
});

route('GET', '/api/staff/vehicles', async ({ db, req }) => { staff(req); return { items: await listVehicles(db, { includeHidden: true }) }; });

route('PATCH', '/api/staff/vehicles/:id', async ({ db, req, params, body }) => {
  const s = staff(req, 'admin');
  return updateVehicle(db, params.id, body, `staff:${s.u}`);
});

route('GET', '/api/staff/statuses', async ({ req }) => { staff(req); return { statuses: STATUS_INFO }; });

route('POST', '/api/staff/demo/reset', async ({ db, req }) => {
  const s = staff(req, 'admin');
  if (!isDemo()) throw new ApiError(403, 'not_demo', 'Reset is only available in demo mode.');
  await resetDemo(db, `staff:${s.u}`);
  return { ok: true };
});

route('GET', '/api/staff/audit', async ({ db, req }) => {
  staff(req, 'admin');
  return { items: await q(db, 'SELECT actor, action, detail, created_at FROM audit_log WHERE tenant_id = ? ORDER BY id DESC LIMIT 100', [TENANT]) };
});

// ---------------------------------------------------------------- dispatcher
export async function handle(req, res, options = {}) {
  const url = new URL(req.url, 'http://local');
  // Vercel rewrite passes the original path as ?__path=...
  const path = url.searchParams.get('__path') ? `/api/${url.searchParams.get('__path')}` : url.pathname.replace(/\/+$/, '') || '/';
  url.searchParams.delete('__path');
  try {
    const match = routes.find((r) => r.method === req.method && r.re.test(path));
    if (!match) {
      const anyMethod = routes.some((r) => r.re.test(path));
      throw new ApiError(anyMethod ? 405 : 404, anyMethod ? 'method_not_allowed' : 'not_found', anyMethod ? 'Method not allowed.' : 'Not found.');
    }
    let body = {};
    if (req.method === 'POST' || req.method === 'PATCH') {
      requireJson(req);
      body = await readJson(req);
    }
    const db = await getDb(options);
    const out = await match.fn({ db, req, body, query: url.searchParams, params: path.match(match.re).groups || {} });
    const { _status = 200, _headers = {}, ...rest } = out || {};
    send(res, _status, rest, _headers);
  } catch (err) {
    if (err instanceof ApiError) return send(res, err.status, { error: { code: err.code, message: err.message, fields: err.fields } });
    console.error('[driveflow] unhandled', err);
    send(res, 500, { error: { code: 'server_error', message: 'Something went wrong on our side. Please try again.' } });
  }
}
