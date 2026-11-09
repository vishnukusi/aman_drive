// Database access (libSQL / SQLite dialect).
//   Local & tests:  DATABASE_URL=file:./data/driveflow.db   (default) or ':memory:'
//   Production:     DATABASE_URL=libsql://<db>.turso.io + DATABASE_AUTH_TOKEN (hosted libSQL)
// Every row carries tenant_id so the same deployment could serve more than one rental business later.

import { createClient } from '@libsql/client';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

const SCHEMA = [
  `CREATE TABLE IF NOT EXISTS enquiries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tenant_id TEXT NOT NULL,
    reference TEXT NOT NULL UNIQUE,
    access_key_hash TEXT NOT NULL,
    status TEXT NOT NULL,
    source TEXT NOT NULL,
    is_demo INTEGER NOT NULL DEFAULT 0,
    customer_name TEXT NOT NULL,
    customer_mobile TEXT NOT NULL,
    customer_email TEXT,
    whatsapp_opt_in INTEGER NOT NULL DEFAULT 0,
    vehicle_id TEXT,
    vehicle_name TEXT,
    city TEXT,
    pickup_date TEXT,
    pickup_time TEXT,
    return_date TEXT,
    return_time TEXT,
    pickup_mode TEXT,
    pickup_detail TEXT,
    return_mode TEXT,
    return_detail TEXT,
    trip_type TEXT,
    destination TEXT,
    notes TEXT,
    raw_message TEXT,
    intake_json TEXT,
    estimate_json TEXT,
    quote_amount INTEGER,
    staff_notes TEXT,
    version INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    CHECK (status IN ('RECEIVED','DETAILS_PENDING','PROCESSING','STAFF_REVIEW','QUOTE_READY','APPROVED','REJECTED','BOOKING_CONFIRMED','CANCELLED')),
    CHECK (length(reference) = 9)
  )`,
  `CREATE INDEX IF NOT EXISTS idx_enq_tenant_status ON enquiries (tenant_id, status)`,
  `CREATE INDEX IF NOT EXISTS idx_enq_tenant_updated ON enquiries (tenant_id, updated_at)`,
  `CREATE TABLE IF NOT EXISTS enquiry_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tenant_id TEXT NOT NULL,
    enquiry_id INTEGER NOT NULL REFERENCES enquiries(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    from_status TEXT,
    to_status TEXT,
    actor TEXT NOT NULL,
    note TEXT,
    data_json TEXT,
    created_at TEXT NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_events_enquiry ON enquiry_events (enquiry_id, id)`,
  `CREATE TABLE IF NOT EXISTS communications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tenant_id TEXT NOT NULL,
    enquiry_id INTEGER NOT NULL REFERENCES enquiries(id) ON DELETE CASCADE,
    channel TEXT NOT NULL,
    direction TEXT NOT NULL,
    template TEXT NOT NULL,
    body TEXT NOT NULL,
    status TEXT NOT NULL,
    provider TEXT NOT NULL,
    provider_message_id TEXT,
    error TEXT,
    attempts INTEGER NOT NULL DEFAULT 0,
    actor TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    CHECK (status IN ('handoff_link','not_configured','sent','failed','simulated'))
  )`,
  `CREATE TABLE IF NOT EXISTS staff_users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tenant_id TEXT NOT NULL,
    username TEXT NOT NULL,
    display_name TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL,
    created_at TEXT NOT NULL,
    UNIQUE (tenant_id, username),
    CHECK (role IN ('admin','staff','viewer'))
  )`,
  `CREATE TABLE IF NOT EXISTS vehicles (
    tenant_id TEXT NOT NULL,
    id TEXT NOT NULL,
    data_json TEXT NOT NULL,
    visible INTEGER NOT NULL DEFAULT 1,
    updated_at TEXT NOT NULL,
    PRIMARY KEY (tenant_id, id)
  )`,
  // Monotonic change log that powers dashboard / tracking-page polling.
  `CREATE TABLE IF NOT EXISTS changes (
    seq INTEGER PRIMARY KEY AUTOINCREMENT,
    tenant_id TEXT NOT NULL,
    enquiry_id INTEGER,
    created_at TEXT NOT NULL
  )`,
  // Audit log for security-relevant staff actions (logins, failed logins, resets, vehicle edits).
  `CREATE TABLE IF NOT EXISTS audit_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    tenant_id TEXT NOT NULL,
    actor TEXT NOT NULL,
    action TEXT NOT NULL,
    detail TEXT,
    ip TEXT,
    created_at TEXT NOT NULL
  )`,
];

// Accepts our own variable names or the ones the Vercel Turso integration creates (TURSO_DATABASE_URL / TURSO_AUTH_TOKEN).
export const dbUrlFromEnv = (env = process.env) => env.DATABASE_URL || env.TURSO_DATABASE_URL || '';
export const dbTokenFromEnv = (env = process.env) => env.DATABASE_AUTH_TOKEN || env.TURSO_AUTH_TOKEN || undefined;

export function openDb(url = dbUrlFromEnv() || 'file:./data/driveflow.db', authToken = dbTokenFromEnv()) {
  if (url.startsWith('file:') && !url.includes(':memory:')) {
    const path = url.slice(5);
    try { mkdirSync(dirname(path), { recursive: true }); } catch { /* exists */ }
  }
  const client = createClient(authToken ? { url, authToken } : { url });
  const kind = url.startsWith('file:') || url === ':memory:' ? 'libsql-file' : 'libsql-remote';
  return { client, kind };
}

export async function migrate(db) {
  await db.client.execute('PRAGMA foreign_keys = ON').catch(() => {});
  for (const sql of SCHEMA) await db.client.execute(sql);
}

export const nowIso = () => new Date().toISOString();

export async function q(db, sql, args = []) {
  return (await db.client.execute({ sql, args })).rows;
}

export async function one(db, sql, args = []) {
  return (await q(db, sql, args))[0] || null;
}
