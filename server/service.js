// Enquiry service: the business logic behind the API. All state changes go through here.
import { VEHICLES } from '../src/data/vehicles.js';
import { CITIES } from '../src/data/business.js';
import { nowIso, one, q } from './db.js';
import { hashKey, keyMatches, newAccessKey, newReference, normaliseReference, REF_PATTERN } from './ids.js';
import { runIntake } from './intake.js';
import { ALL_STATUSES, STATUS, STATUS_INFO, canTransition, nextStatusesFor, transitionRequirements } from './workflow.js';
import { customerToBusinessLink, providerName, sendTemplate, TEMPLATES } from './whatsapp.js';
import { hashPassword } from './security.js';

export const TENANT = 'aman';

export class ApiError extends Error {
  constructor(status, code, message, fields) {
    super(message);
    this.status = status;
    this.code = code;
    this.fields = fields;
  }
}

const FIELD_LABELS = { vehicleId: 'car', city: 'pickup city', pickupDate: 'pickup date', returnDate: 'return date', name: 'name', mobile: 'mobile number' };
export const missingText = (missing) => missing.map((k) => FIELD_LABELS[k] || k).join(', ');

// ---------------------------------------------------------------- vehicles
export async function listVehicles(db, { includeHidden = false } = {}) {
  const rows = await q(db, 'SELECT data_json, visible FROM vehicles WHERE tenant_id = ? ORDER BY id', [TENANT]);
  const list = rows.map((r) => ({ ...JSON.parse(r.data_json), visible: !!r.visible }));
  return includeHidden ? list : list.filter((v) => v.visible);
}

export async function updateVehicle(db, id, patch, actor) {
  const row = await one(db, 'SELECT data_json, visible FROM vehicles WHERE tenant_id = ? AND id = ?', [TENANT, id]);
  if (!row) throw new ApiError(404, 'not_found', 'Vehicle not found.');
  const cur = JSON.parse(row.data_json);
  const next = { ...cur };
  const errors = {};
  for (const k of ['rate24', 'rate12', 'extraHour']) {
    if (patch[k] === undefined) continue;
    if (patch[k] === null && k !== 'rate24') next[k] = null;
    else if (Number.isInteger(patch[k]) && patch[k] > 0 && patch[k] < 1_000_000) next[k] = patch[k];
    else errors[k] = 'Enter a whole number of rupees.';
  }
  if (Object.keys(errors).length) throw new ApiError(400, 'invalid', 'Some values are invalid.', errors);
  const visible = patch.visible === undefined ? !!row.visible : !!patch.visible;
  next.verified = next.verified && ['rate24', 'rate12', 'extraHour'].every((k) => next[k] === cur[k]);
  await q(db, 'UPDATE vehicles SET data_json = ?, visible = ?, updated_at = ? WHERE tenant_id = ? AND id = ?', [JSON.stringify(next), visible ? 1 : 0, nowIso(), TENANT, id]);
  await audit(db, actor, 'vehicle.update', `${id}: ${JSON.stringify(patch)}`);
  return { ...next, visible };
}

// ---------------------------------------------------------------- audit + change feed
export async function audit(db, actor, action, detail, ip) {
  await q(db, 'INSERT INTO audit_log (tenant_id, actor, action, detail, ip, created_at) VALUES (?,?,?,?,?,?)', [TENANT, actor, action, detail || null, ip || null, nowIso()]);
}

export async function changesAfter(db, after) {
  const rows = await q(db, 'SELECT seq, enquiry_id FROM changes WHERE tenant_id = ? AND seq > ? ORDER BY seq LIMIT 500', [TENANT, Number(after) || 0]);
  const last = await one(db, 'SELECT MAX(seq) AS seq FROM changes WHERE tenant_id = ?', [TENANT]);
  return { seq: Number(last?.seq || 0), changed: rows.length > 0, enquiryIds: [...new Set(rows.map((r) => Number(r.enquiry_id)))] };
}

const changeStmt = (enquiryIdSql = '?', args = []) => ({
  sql: `INSERT INTO changes (tenant_id, enquiry_id, created_at) VALUES (?, ${enquiryIdSql}, ?)`,
  args: [TENANT, ...args, nowIso()],
});

// ---------------------------------------------------------------- reads
const parse = (s) => (s ? JSON.parse(s) : null);

async function getRow(db, reference) {
  const ref = normaliseReference(reference);
  if (!REF_PATTERN.test(ref)) return null;
  return one(db, 'SELECT * FROM enquiries WHERE tenant_id = ? AND reference = ?', [TENANT, ref]);
}

export async function requireRow(db, reference) {
  const row = await getRow(db, reference);
  if (!row) throw new ApiError(404, 'not_found', 'No enquiry with that reference.');
  return row;
}

export function staffView(row) {
  return {
    reference: row.reference,
    status: row.status,
    statusLabel: STATUS_INFO[row.status].label,
    source: row.source,
    isDemo: !!row.is_demo,
    customer: { name: row.customer_name, mobile: row.customer_mobile, email: row.customer_email, whatsappOptIn: !!row.whatsapp_opt_in },
    vehicle: row.vehicle_id ? { id: row.vehicle_id, name: row.vehicle_name } : null,
    city: row.city,
    cityName: CITIES.find((c) => c.id === row.city)?.name || null,
    pickup: { date: row.pickup_date, time: row.pickup_time },
    ret: { date: row.return_date, time: row.return_time },
    pickupMode: row.pickup_mode,
    pickupDetail: row.pickup_detail,
    returnMode: row.return_mode,
    returnDetail: row.return_detail,
    tripType: row.trip_type,
    destination: row.destination,
    notes: row.notes,
    rawMessage: row.raw_message,
    intake: parse(row.intake_json),
    estimate: parse(row.estimate_json),
    quoteAmount: row.quote_amount,
    staffNotes: row.staff_notes || '',
    version: Number(row.version),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function getEnquiryFull(db, reference, actorRole) {
  const row = await requireRow(db, reference);
  const events = await q(db, 'SELECT type, from_status, to_status, actor, note, data_json, created_at FROM enquiry_events WHERE enquiry_id = ? ORDER BY id', [row.id]);
  const comms = await q(db, 'SELECT id, template, body, status, provider, provider_message_id, error, attempts, actor, created_at FROM communications WHERE enquiry_id = ? ORDER BY id', [row.id]);
  const canWrite = actorRole === 'admin' || actorRole === 'staff';
  return {
    ...staffView(row),
    events: events.map((e) => ({ type: e.type, from: e.from_status, to: e.to_status, actor: e.actor, note: e.note, data: parse(e.data_json), at: e.created_at })),
    communications: comms.map((c) => ({ id: Number(c.id), template: c.template, title: TEMPLATES[c.template]?.title || c.template, body: c.body, status: c.status, provider: c.provider, providerMessageId: c.provider_message_id, error: c.error, attempts: Number(c.attempts), actor: c.actor, at: c.created_at })),
    allowedTransitions: canWrite ? nextStatusesFor(row.status, 'staff').map((s) => ({ to: s, label: STATUS_INFO[s].label })) : [],
    whatsappProvider: providerName(),
  };
}

export async function listEnquiries(db, { q: search = '', status = '', city = '', limit = 50, offset = 0 } = {}) {
  const where = ['tenant_id = ?'];
  const args = [TENANT];
  if (status && ALL_STATUSES.includes(status)) { where.push('status = ?'); args.push(status); }
  if (city && CITIES.some((c) => c.id === city)) { where.push('city = ?'); args.push(city); }
  const s = String(search).trim();
  if (s) {
    const like = `%${s.replace(/[%_]/g, '')}%`;
    where.push('(reference LIKE ? OR customer_name LIKE ? OR customer_mobile LIKE ? OR vehicle_name LIKE ? OR destination LIKE ?)');
    args.push(like.toUpperCase().startsWith('%DF') ? like.toUpperCase() : like, like, like, like, like);
  }
  const lim = Math.min(Math.max(Number(limit) || 50, 1), 200);
  const off = Math.max(Number(offset) || 0, 0);
  const rows = await q(db, `SELECT * FROM enquiries WHERE ${where.join(' AND ')} ORDER BY updated_at DESC LIMIT ${lim} OFFSET ${off}`, args);
  const total = await one(db, `SELECT COUNT(*) AS n FROM enquiries WHERE ${where.join(' AND ')}`, args);
  return { total: Number(total.n), items: rows.map(staffView) };
}

export async function summary(db) {
  const rows = await q(db, 'SELECT status, COUNT(*) AS n FROM enquiries WHERE tenant_id = ? GROUP BY status', [TENANT]);
  const by = Object.fromEntries(ALL_STATUSES.map((s) => [s, 0]));
  rows.forEach((r) => { by[r.status] = Number(r.n); });
  const total = Object.values(by).reduce((a, b) => a + b, 0);
  const demo = await one(db, 'SELECT COUNT(*) AS n FROM enquiries WHERE tenant_id = ? AND is_demo = 1', [TENANT]);
  const today = await one(db, "SELECT COUNT(*) AS n FROM enquiries WHERE tenant_id = ? AND created_at >= ?", [TENANT, new Date(Date.now() - 864e5).toISOString()]);
  const bySource = await q(db, 'SELECT source, COUNT(*) AS n FROM enquiries WHERE tenant_id = ? GROUP BY source', [TENANT]);
  const comms = await q(db, 'SELECT status, COUNT(*) AS n FROM communications WHERE tenant_id = ? GROUP BY status', [TENANT]);
  return {
    total,
    demo: Number(demo.n),
    last24h: Number(today.n),
    byStatus: by,
    cards: {
      newEnquiries: by.RECEIVED + by.PROCESSING,
      detailsPending: by.DETAILS_PENDING,
      staffReview: by.STAFF_REVIEW,
      quoteReady: by.QUOTE_READY,
      approved: by.APPROVED,
      confirmed: by.BOOKING_CONFIRMED,
      closed: by.REJECTED + by.CANCELLED,
    },
    bySource: Object.fromEntries(bySource.map((r) => [r.source, Number(r.n)])),
    communications: Object.fromEntries(comms.map((r) => [r.status, Number(r.n)])),
  };
}

// ---------------------------------------------------------------- writes
async function recordCommunication(db, row, comm, actor) {
  const now = nowIso();
  await db.client.batch([
    {
      sql: `INSERT INTO communications (tenant_id, enquiry_id, channel, direction, template, body, status, provider, provider_message_id, error, attempts, actor, created_at, updated_at)
            VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      args: [TENANT, row.id, comm.channel, comm.direction, comm.template, comm.body, comm.status, comm.provider, comm.providerMessageId, comm.error, comm.attempts, actor, now, now],
    },
    {
      sql: 'INSERT INTO enquiry_events (tenant_id, enquiry_id, type, actor, note, data_json, created_at) VALUES (?,?,?,?,?,?,?)',
      args: [TENANT, row.id, 'communication', actor, `${TEMPLATES[comm.template].title}: ${comm.status.replace('_', ' ')}`, JSON.stringify({ template: comm.template, status: comm.status, provider: comm.provider }), now],
    },
    changeStmt('?', [row.id]),
  ], 'write');
  return comm;
}

/**
 * Atomic, version-checked status change. Throws 409 if someone else changed the enquiry first,
 * 422 if the state machine or the transition's requirements refuse it.
 */
export async function transition(db, reference, to, { actor, note = '', quoteAmount, expectedVersion, data } = {}) {
  const row = await requireRow(db, reference);
  if (!ALL_STATUSES.includes(to)) throw new ApiError(400, 'invalid_status', 'Unknown status.');
  if (!canTransition(row.status, to, actor)) {
    throw new ApiError(422, 'invalid_transition', `Cannot move from ${STATUS_INFO[row.status].label} to ${STATUS_INFO[to].label}.`);
  }
  const reqErr = transitionRequirements(to, { quoteAmount, note });
  if (reqErr && actor !== 'system' && !String(actor).startsWith('system')) throw new ApiError(422, 'requirements', reqErr);
  if (expectedVersion !== undefined && Number(expectedVersion) !== Number(row.version)) {
    throw new ApiError(409, 'conflict', 'This enquiry was updated by someone else. Refresh and try again.');
  }
  const now = nowIso();
  const res = await db.client.batch([
    {
      sql: `UPDATE enquiries SET status = ?, version = version + 1, updated_at = ?, quote_amount = COALESCE(?, quote_amount)
            WHERE id = ? AND status = ? AND version = ?`,
      args: [to, now, to === STATUS.QUOTE_READY ? quoteAmount : null, row.id, row.status, row.version],
    },
    {
      sql: `INSERT INTO enquiry_events (tenant_id, enquiry_id, type, from_status, to_status, actor, note, data_json, created_at)
            SELECT ?,?,?,?,?,?,?,?,? WHERE changes() = 1`,
      args: [TENANT, row.id, 'status', row.status, to, actor, note || null, data ? JSON.stringify(data) : (to === STATUS.QUOTE_READY ? JSON.stringify({ quoteAmount }) : null), now],
    },
    changeStmt('?', [row.id]),
  ], 'write');
  if (Number(res[0].rowsAffected) !== 1) throw new ApiError(409, 'conflict', 'This enquiry was updated by someone else. Refresh and try again.');
  return requireRow(db, row.reference);
}

/** The automated part of the workflow: RECEIVED/DETAILS_PENDING -> PROCESSING -> (DETAILS_PENDING | STAFF_REVIEW). */
async function runPipeline(db, row, intake) {
  let cur = row;
  if (cur.status === STATUS.RECEIVED) {
    cur = await transition(db, cur.reference, STATUS.PROCESSING, {
      actor: 'system:intake',
      note: `Automated intake (${intake.engine.kind}): ${intake.extracted.length ? `extracted ${intake.extracted.join(', ')} from the message; ` : ''}${intake.complete ? 'all required details present' : `missing ${missingText(intake.missing)}`}.`,
      data: { complete: intake.complete, missing: intake.missing, extracted: intake.extracted, estimate: intake.estimate?.amount ?? null },
    });
  }
  if (cur.status === STATUS.PROCESSING) {
    if (intake.complete) {
      cur = await transition(db, cur.reference, STATUS.STAFF_REVIEW, { actor: 'system:workflow', note: 'Complete enquiry queued for staff review.' });
    } else {
      cur = await transition(db, cur.reference, STATUS.DETAILS_PENDING, { actor: 'system:workflow', note: `Waiting for: ${missingText(intake.missing)}.`, data: { missing: intake.missing } });
    }
  }
  return cur;
}

/**
 * Creates an enquiry. The reference is generated here, written with a UNIQUE constraint, and only returned after the
 * transaction commits. Prices and IDs sent by the browser are ignored.
 */
export async function createEnquiry(db, input, { source = 'website', isDemo = false, now = new Date(), ip, refGen = newReference } = {}) {
  const vehicles = await listVehicles(db);
  const intake = runIntake(input, { vehicles, now });
  const d = intake.draft;
  if (Object.keys(intake.errors).length) throw new ApiError(400, 'invalid', 'Please correct the highlighted details.', intake.errors);
  const contactMissing = intake.missing.filter((k) => k === 'name' || k === 'mobile');
  if (contactMissing.length) {
    throw new ApiError(400, 'contact_required', 'We need your name and mobile number to save the enquiry.',
      Object.fromEntries(contactMissing.map((k) => [k, intake.questions.find((x) => x.field === k).question])));
  }
  const vehicle = vehicles.find((v) => v.id === d.vehicleId) || null;
  const accessKey = newAccessKey();
  const ts = nowIso();
  const allowedSources = ['website-wizard', 'website-quick', 'vehicle-card', 'chat-intake', 'staff', 'demo-seed'];
  const src = allowedSources.includes(source) ? source : 'website';

  let reference = null;
  for (let attempt = 0; attempt < 5 && !reference; attempt++) {
    const candidate = refGen();
    try {
      await db.client.batch([
        {
          sql: `INSERT INTO enquiries (tenant_id, reference, access_key_hash, status, source, is_demo, customer_name, customer_mobile, customer_email,
                 whatsapp_opt_in, vehicle_id, vehicle_name, city, pickup_date, pickup_time, return_date, return_time, pickup_mode, pickup_detail,
                 return_mode, return_detail, trip_type, destination, notes, raw_message, intake_json, estimate_json, created_at, updated_at)
                VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
          args: [TENANT, candidate, hashKey(accessKey), STATUS.RECEIVED, src, isDemo ? 1 : 0, d.name, d.mobile, d.email || null,
            input.whatsappOptIn ? 1 : 0, vehicle?.id || null, vehicle?.name || null, d.city || null, d.pickupDate || null, d.pickupTime || null,
            d.returnDate || null, d.returnTime || null, d.pickupMode || null, d.pickupDetail || null, d.returnMode || null, d.returnDetail || null,
            d.tripType || null, d.destination || null, d.notes || null, input.message ? String(input.message).slice(0, 1200) : null,
            JSON.stringify(intake), intake.estimate ? JSON.stringify(intake.estimate) : null, ts, ts],
        },
        {
          sql: `INSERT INTO enquiry_events (tenant_id, enquiry_id, type, to_status, actor, note, data_json, created_at)
                VALUES (?, last_insert_rowid(), 'created', 'RECEIVED', 'customer', ?, ?, ?)`,
          args: [TENANT, `Enquiry received from ${src}.`, JSON.stringify({ source: src, ip: ip ? 'recorded' : null }), ts],
        },
        changeStmt('(SELECT id FROM enquiries WHERE reference = ?)', [candidate]),
      ], 'write');
      reference = candidate;
    } catch (err) {
      if (!/UNIQUE constraint failed: enquiries\.reference/i.test(String(err.message))) throw err;
    }
  }
  if (!reference) throw new ApiError(503, 'id_exhausted', 'Could not allocate a reference. Please try again.');

  let row = await requireRow(db, reference);
  row = await runPipeline(db, row, intake);
  await recordCommunication(db, row, await sendTemplate(row, 'enquiry_received', { automatic: true }), 'system:notify');
  if (row.status === STATUS.DETAILS_PENDING && providerName() !== 'manual') {
    await recordCommunication(db, row, await sendTemplate(row, 'details_required', { automatic: true, extra: { missingText: missingText(intake.missing) } }), 'system:notify');
  }
  return { row: await requireRow(db, reference), accessKey, intake };
}

/** Customer adds missing details (only while DETAILS_PENDING). Re-runs intake and the automated pipeline. */
export async function supplyDetails(db, row, fields, { now = new Date() } = {}) {
  if (row.status !== STATUS.DETAILS_PENDING) throw new ApiError(422, 'not_pending', 'This enquiry is not waiting for details.');
  const current = {
    vehicleId: row.vehicle_id, city: row.city, pickupDate: row.pickup_date, pickupTime: row.pickup_time, returnDate: row.return_date,
    returnTime: row.return_time, destination: row.destination, notes: row.notes, name: row.customer_name, mobile: row.customer_mobile,
  };
  const allowed = ['vehicleId', 'city', 'pickupDate', 'returnDate', 'pickupTime', 'returnTime', 'destination', 'notes'];
  const patch = Object.fromEntries(Object.entries(fields || {}).filter(([k, v]) => allowed.includes(k) && v !== '' && v != null));
  const vehicles = await listVehicles(db);
  const intake = runIntake({ ...current, ...patch }, { vehicles, now });
  if (Object.keys(intake.errors).length) throw new ApiError(400, 'invalid', 'Please correct the highlighted details.', intake.errors);
  const d = intake.draft;
  const vehicle = vehicles.find((v) => v.id === d.vehicleId) || null;
  const ts = nowIso();
  await db.client.batch([
    {
      sql: `UPDATE enquiries SET vehicle_id = ?, vehicle_name = ?, city = ?, pickup_date = ?, pickup_time = ?, return_date = ?, return_time = ?,
            destination = ?, notes = ?, intake_json = ?, estimate_json = ?, version = version + 1, updated_at = ? WHERE id = ? AND status = 'DETAILS_PENDING'`,
      args: [vehicle?.id || null, vehicle?.name || null, d.city || null, d.pickupDate || null, d.pickupTime || null, d.returnDate || null,
        d.returnTime || null, d.destination || null, d.notes || null, JSON.stringify(intake), intake.estimate ? JSON.stringify(intake.estimate) : null, ts, row.id],
    },
    {
      sql: 'INSERT INTO enquiry_events (tenant_id, enquiry_id, type, actor, note, data_json, created_at) VALUES (?,?,?,?,?,?,?)',
      args: [TENANT, row.id, 'details', 'customer', `Customer added: ${missingText(Object.keys(patch)) || 'no new fields'}.`, JSON.stringify({ fields: Object.keys(patch) }), ts],
    },
    changeStmt('?', [row.id]),
  ], 'write');
  let cur = await transition(db, row.reference, STATUS.PROCESSING, { actor: 'customer', note: 'Details supplied; re-running automated intake.' });
  if (intake.complete) cur = await transition(db, cur.reference, STATUS.STAFF_REVIEW, { actor: 'system:workflow', note: 'Complete enquiry queued for staff review.' });
  else cur = await transition(db, cur.reference, STATUS.DETAILS_PENDING, { actor: 'system:workflow', note: `Still waiting for: ${missingText(intake.missing)}.`, data: { missing: intake.missing } });
  return { row: cur, intake };
}

export async function saveStaffNotes(db, reference, notes, actor) {
  const row = await requireRow(db, reference);
  const text = String(notes || '').slice(0, 2000);
  const ts = nowIso();
  await db.client.batch([
    { sql: 'UPDATE enquiries SET staff_notes = ?, version = version + 1, updated_at = ? WHERE id = ?', args: [text, ts, row.id] },
    { sql: 'INSERT INTO enquiry_events (tenant_id, enquiry_id, type, actor, note, created_at) VALUES (?,?,?,?,?,?)', args: [TENANT, row.id, 'note', actor, 'Internal note updated.', ts] },
    changeStmt('?', [row.id]),
  ], 'write');
  return requireRow(db, reference);
}

/** Staff-triggered WhatsApp message. In manual mode this prepares a link for the staff member to send. */
export async function staffMessage(db, reference, template, actor) {
  const row = await requireRow(db, reference);
  if (!TEMPLATES[template]) throw new ApiError(400, 'invalid_template', 'Unknown message template.');
  if (template === 'quote_ready' && !row.quote_amount) throw new ApiError(422, 'no_quote', 'Set a quote first (move the enquiry to Quote ready).');
  const intake = parse(row.intake_json) || { missing: [] };
  const comm = await sendTemplate(row, template, { extra: { statusLabel: STATUS_INFO[row.status].customer, missingText: missingText(intake.missing || []) } });
  await recordCommunication(db, row, comm, actor);
  return comm;
}

// ---------------------------------------------------------------- customer tracking (limited, privacy-preserving view)
export function customerView(row) {
  const intake = parse(row.intake_json) || {};
  const info = STATUS_INFO[row.status];
  return {
    reference: row.reference,
    status: row.status,
    statusLabel: info.customer,
    next: info.next,
    firstName: String(row.customer_name).split(' ')[0],
    mobileMasked: `******${String(row.customer_mobile).slice(-4)}`,
    vehicle: row.vehicle_name,
    city: CITIES.find((c) => c.id === row.city)?.name || null,
    pickupDate: row.pickup_date,
    returnDate: row.return_date,
    destination: row.destination,
    estimate: parse(row.estimate_json),
    quoteAmount: [STATUS.QUOTE_READY, STATUS.APPROVED, STATUS.BOOKING_CONFIRMED].includes(row.status) ? row.quote_amount : null,
    missing: row.status === STATUS.DETAILS_PENDING ? intake.missing || [] : [],
    questions: row.status === STATUS.DETAILS_PENDING ? intake.questions || [] : [],
    isDemo: !!row.is_demo,
    version: Number(row.version),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    whatsappLink: customerToBusinessLink(`Hi Aman Self Drive, this is about my enquiry ${row.reference}.`),
  };
}

export async function customerTimeline(db, row) {
  const ev = await q(db, "SELECT type, to_status, actor, created_at FROM enquiry_events WHERE enquiry_id = ? AND type IN ('created','status','details') ORDER BY id", [row.id]);
  return ev.map((e) => ({
    status: e.to_status,
    label: e.type === 'details' ? 'You added details' : STATUS_INFO[e.to_status]?.customer || e.to_status,
    by: e.actor.startsWith('system') ? 'DriveFlow automation' : e.actor === 'customer' ? 'You' : 'Aman Self Drive team',
    at: e.created_at,
  }));
}

/** Either the access key from the tracking link, or the last 4 digits of the mobile number, unlocks the customer view. */
export async function authoriseCustomer(db, reference, { key, last4 }) {
  const row = await getRow(db, reference);
  const ok = row && ((key && keyMatches(key, row.access_key_hash)) || (last4 && /^\d{4}$/.test(last4) && String(row.customer_mobile).endsWith(last4)));
  if (!ok) throw new ApiError(404, 'not_found', 'We could not find an enquiry matching those details.');
  return row;
}

// ---------------------------------------------------------------- seeding (demo + first run)
export async function ensureSeed(db, { demo, env = process.env } = {}) {
  const v = await one(db, 'SELECT COUNT(*) AS n FROM vehicles WHERE tenant_id = ?', [TENANT]);
  if (!Number(v.n)) {
    const ts = nowIso();
    await db.client.batch(VEHICLES.map((x) => ({
      sql: 'INSERT INTO vehicles (tenant_id, id, data_json, visible, updated_at) VALUES (?,?,?,?,?)',
      args: [TENANT, x.id, JSON.stringify(x), x.visible ? 1 : 0, ts],
    })), 'write');
  }
  const u = await one(db, 'SELECT COUNT(*) AS n FROM staff_users WHERE tenant_id = ?', [TENANT]);
  if (!Number(u.n)) {
    const users = [];
    if (env.STAFF_ADMIN_PASSWORD) users.push(['admin', 'Administrator', env.STAFF_ADMIN_PASSWORD, 'admin']);
    else if (demo) {
      const pw = env.DEMO_STAFF_PASSWORD || 'driveflow-demo';
      users.push(['admin', 'Demo Admin', pw, 'admin'], ['staff', 'Demo Staff', pw, 'staff'], ['viewer', 'Demo Viewer', pw, 'viewer']);
    }
    for (const [username, name, pw, role] of users) {
      await q(db, 'INSERT INTO staff_users (tenant_id, username, display_name, password_hash, role, created_at) VALUES (?,?,?,?,?,?)', [TENANT, username, name, hashPassword(pw), role, nowIso()]);
    }
  }
  if (demo) {
    const e = await one(db, 'SELECT COUNT(*) AS n FROM enquiries WHERE tenant_id = ?', [TENANT]);
    if (!Number(e.n)) await seedDemoEnquiries(db);
  }
}

const dayOffset = (n) => {
  const d = new Date(Date.now() + 330 * 60000);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};

/** Fictional demo enquiries, created through the real workflow so every event is genuine. Marked is_demo. */
export async function seedDemoEnquiries(db) {
  const sys = { isDemo: true, source: 'demo-seed' };
  const mk = (o) => createEnquiry(db, o, sys);
  const a = await mk({ name: 'Demo Customer A', mobile: '9000000011', vehicleId: 'creta', city: 'vijayawada', pickupDate: dayOffset(2), returnDate: dayOffset(4), destination: 'Hyderabad', tripType: 'outstation' });
  await mk({ name: 'Demo Customer B', mobile: '9000000022', message: 'Need an automatic SUV in Hyderabad this weekend for a family trip to Srisailam' });
  const c = await mk({ name: 'Demo Customer C', mobile: '9000000033', vehicleId: 'innova', city: 'vizag', pickupDate: dayOffset(5), returnDate: dayOffset(8), destination: 'Araku Valley' });
  await transition(db, c.row.reference, STATUS.QUOTE_READY, { actor: 'staff:demo', quoteAmount: 13500, note: 'Demo: 3 × ₹4,500 published rate.' });
  const d = await mk({ name: 'Demo Customer D', mobile: '9000000044', vehicleId: 'swift', city: 'vijayawada', pickupDate: dayOffset(1), returnDate: dayOffset(2) });
  await transition(db, d.row.reference, STATUS.QUOTE_READY, { actor: 'staff:demo', quoteAmount: 2500, note: 'Demo quote.' });
  await transition(db, d.row.reference, STATUS.APPROVED, { actor: 'staff:demo', note: 'Demo: customer accepted on WhatsApp.' });
  await transition(db, d.row.reference, STATUS.BOOKING_CONFIRMED, { actor: 'staff:demo', note: 'Demo: documents verified, deposit received.' });
  const e = await mk({ name: 'Demo Customer E', mobile: '9000000055', vehicleId: 'fortuner', city: 'hyderabad', pickupDate: dayOffset(3), returnDate: dayOffset(3) });
  await transition(db, e.row.reference, STATUS.REJECTED, { actor: 'staff:demo', note: 'Demo: car not available on that date; offered Innova Crysta.' });
  return [a, c, d, e].map((x) => x.row.reference);
}

export async function resetDemo(db, actor) {
  await db.client.batch([
    { sql: 'DELETE FROM communications WHERE tenant_id = ?', args: [TENANT] },
    { sql: 'DELETE FROM enquiry_events WHERE tenant_id = ?', args: [TENANT] },
    { sql: 'DELETE FROM enquiries WHERE tenant_id = ?', args: [TENANT] },
    { sql: 'DELETE FROM vehicles WHERE tenant_id = ?', args: [TENANT] },
  ], 'write');
  await ensureSeed(db, { demo: true });
  await q(db, 'INSERT INTO changes (tenant_id, enquiry_id, created_at) VALUES (?, NULL, ?)', [TENANT, nowIso()]);
  await audit(db, actor, 'demo.reset');
}
