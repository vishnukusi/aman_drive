// Staff authentication, sessions and rate limiting. Node built-ins only.
import { createHmac, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

// ---------------------------------------------------------------- passwords (scrypt)
export function hashPassword(password) {
  const salt = randomBytes(16);
  const hash = scryptSync(String(password), salt, 32, { N: 16384, r: 8, p: 1 });
  return `scrypt$${salt.toString('base64url')}$${hash.toString('base64url')}`;
}

export function verifyPassword(password, stored) {
  const [alg, salt, hash] = String(stored || '').split('$');
  if (alg !== 'scrypt' || !salt || !hash) return false;
  const expected = Buffer.from(hash, 'base64url');
  const actual = scryptSync(String(password), Buffer.from(salt, 'base64url'), expected.length, { N: 16384, r: 8, p: 1 });
  return timingSafeEqual(actual, expected);
}

// ---------------------------------------------------------------- sessions (HMAC-signed, HttpOnly cookie)
export const SESSION_COOKIE = 'df_staff';
const SESSION_HOURS = 12;
let devSecret = null;

export function sessionSecret(env = process.env) {
  if (env.SESSION_SECRET && env.SESSION_SECRET.length >= 32) return env.SESSION_SECRET;
  if (env.NODE_ENV === 'production' || env.VERCEL) throw new Error('SESSION_SECRET (32+ characters) must be set in production.');
  devSecret ||= randomBytes(32).toString('hex'); // dev only: sessions end when the server restarts
  return devSecret;
}

const sign = (data, secret) => createHmac('sha256', secret).update(data).digest('base64url');

export function issueSession(user, env = process.env, now = Date.now()) {
  const payload = Buffer.from(JSON.stringify({ uid: user.id, u: user.username, n: user.display_name, r: user.role, t: user.tenant_id, exp: now + SESSION_HOURS * 3600e3 })).toString('base64url');
  return `${payload}.${sign(payload, sessionSecret(env))}`;
}

export function readSession(token, env = process.env, now = Date.now()) {
  if (!token || !token.includes('.')) return null;
  const [payload, sig] = token.split('.');
  const expected = sign(payload, sessionSecret(env));
  const a = Buffer.from(sig || '');
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const s = JSON.parse(Buffer.from(payload, 'base64url').toString());
    return s.exp > now ? s : null;
  } catch {
    return null;
  }
}

export function sessionCookie(token, { secure }) {
  const parts = [`${SESSION_COOKIE}=${token}`, 'Path=/api', 'HttpOnly', 'SameSite=Strict', `Max-Age=${SESSION_HOURS * 3600}`];
  if (secure) parts.push('Secure');
  return parts.join('; ');
}
export const clearCookie = () => `${SESSION_COOKIE}=; Path=/api; HttpOnly; SameSite=Strict; Max-Age=0`;

export function parseCookies(header = '') {
  return Object.fromEntries(
    header.split(';').map((c) => c.trim()).filter(Boolean).map((c) => {
      const i = c.indexOf('=');
      return [c.slice(0, i), decodeURIComponent(c.slice(i + 1))];
    }),
  );
}

// Role permissions. Viewers can read everything staff can, but cannot change data.
export const CAN = {
  read: ['admin', 'staff', 'viewer'],
  write: ['admin', 'staff'],
  admin: ['admin'],
};

// ---------------------------------------------------------------- rate limiting (fixed window, per instance)
// On serverless hosting each instance keeps its own counters, so this limits bursts rather than guaranteeing a global quota.
const buckets = new Map();
export function rateLimit(key, limit, windowMs, now = Date.now()) {
  const b = buckets.get(key);
  if (!b || b.reset <= now) {
    buckets.set(key, { count: 1, reset: now + windowMs });
    if (buckets.size > 5000) for (const [k, v] of buckets) if (v.reset <= now) buckets.delete(k);
    return { ok: true, retryAfter: 0 };
  }
  b.count++;
  return b.count <= limit ? { ok: true, retryAfter: 0 } : { ok: false, retryAfter: Math.ceil((b.reset - now) / 1000) };
}
export const resetRateLimits = () => buckets.clear();
