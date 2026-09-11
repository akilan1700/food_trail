// File: src/utils/mpinCrypto.js
// Description: Shared MPIN hashing and comparison helpers (PBKDF2 + timing-safe equal).
// Author: Akilan M
// Updated: 2026-09-11

const crypto = require('crypto');

/** Current PBKDF2 iteration count for new hashes. */
const MPIN_ITERATIONS = 100000;

/**
 * Hashes an MPIN with a random salt.
 * Stored format: `v1:<iterations>:<saltHex>:<hashHex>` (legacy `salt:hash` still supported for compare).
 * @param {string|number} mpin - Plaintext MPIN
 * @returns {string} Hashed MPIN string
 */
function hashMpin(mpin) {
  const salt = crypto.randomBytes(16).toString('hex');
  const mpinStr = String(mpin);
  const hash = crypto.pbkdf2Sync(mpinStr, salt, MPIN_ITERATIONS, 64, 'sha512').toString('hex');
  return `v1:${MPIN_ITERATIONS}:${salt}:${hash}`;
}

/**
 * Compares a candidate MPIN to a stored hash (v1 or legacy salt:hash with 1000 iters).
 * @param {string|number} candidateMpin - Plaintext candidate
 * @param {string} stored - Stored hash string
 * @returns {boolean} True if match
 */
function compareMpin(candidateMpin, stored) {
  try {
    if (!stored || typeof stored !== 'string') return false;
    const mpinStr = String(candidateMpin);
    const parts = stored.split(':');

    let iterations;
    let salt;
    let originalHash;

    if (parts[0] === 'v1' && parts.length === 4) {
      iterations = Number(parts[1]);
      salt = parts[2];
      originalHash = parts[3];
    } else if (parts.length === 2) {
      iterations = 1000;
      salt = parts[0];
      originalHash = parts[1];
    } else {
      return false;
    }

    if (!iterations || !salt || !originalHash) return false;

    const hash = crypto.pbkdf2Sync(mpinStr, salt, iterations, 64, 'sha512').toString('hex');
    const hashBuf = Buffer.from(hash, 'hex');
    const originalBuf = Buffer.from(originalHash, 'hex');
    if (hashBuf.length !== originalBuf.length) return false;
    return crypto.timingSafeEqual(hashBuf, originalBuf);
  } catch {
    return false;
  }
}

/**
 * Returns true if the stored value already looks like a hashed MPIN.
 * @param {string} stored - Candidate stored value
 * @returns {boolean}
 */
function isHashedMpin(stored) {
  if (!stored || typeof stored !== 'string') return false;
  if (stored.startsWith('v1:')) return true;
  const parts = stored.split(':');
  return parts.length === 2 && /^[a-f0-9]+$/i.test(parts[0]) && /^[a-f0-9]+$/i.test(parts[1]);
}

module.exports = {
  MPIN_ITERATIONS,
  hashMpin,
  compareMpin,
  isHashedMpin,
};
