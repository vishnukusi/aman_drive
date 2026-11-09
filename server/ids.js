// Tracking references and customer access keys.
//
// Reference: "DF-" + 6 characters from a 31-symbol alphabet without look-alikes (no 0/O, 1/I/L).
//   31^6 ≈ 887 million combinations, random (not sequential), so references cannot be enumerated by counting.
//   Uniqueness is guaranteed by the UNIQUE constraint on enquiries.reference; createEnquiry() retries on collision.
// Access key: 128 random bits, given to the customer once (in their tracking link). Only its SHA-256 hash is stored.

import { createHash, randomBytes, randomInt, timingSafeEqual } from 'node:crypto';

export const REF_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
export const REF_PATTERN = /^DF-[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{6}$/;

export function newReference(rand = randomInt) {
  let s = '';
  for (let i = 0; i < 6; i++) s += REF_ALPHABET[rand(REF_ALPHABET.length)];
  return `DF-${s}`;
}

export const normaliseReference = (raw) => String(raw || '').trim().toUpperCase().replace(/^DF(?!-)/, 'DF-');

export const newAccessKey = () => randomBytes(16).toString('base64url');

export const hashKey = (key) => createHash('sha256').update(String(key)).digest('hex');

export function keyMatches(key, storedHash) {
  if (!key || !storedHash) return false;
  const a = Buffer.from(hashKey(key), 'hex');
  const b = Buffer.from(storedHash, 'hex');
  return a.length === b.length && timingSafeEqual(a, b);
}
