// File: src/utils/jwtSecret.js
// Description: Resolves JWT signing secret with fail-closed behavior in production.
// Author: Akilan M
// Updated: 2026-09-11

let warnedMissingSecret = false;

/**
 * Returns the JWT secret from the environment.
 * In production, throws if JWT_SECRET is unset. In non-production, warns once
 * and uses a clearly insecure local-only placeholder (never the former hardcoded prod fallback).
 * @returns {string} JWT secret string
 */
function getJwtSecret() {
  const secret = process.env.JWT_SECRET;

  if (secret && String(secret).trim()) {
    return String(secret).trim();
  }

  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET environment variable is required in production');
  }

  if (!warnedMissingSecret) {
    warnedMissingSecret = true;
    console.warn(
      '[security] JWT_SECRET is not set. Using a local development placeholder. Set JWT_SECRET before deploying.'
    );
  }

  return 'local-dev-only-jwt-secret-not-for-production';
}

module.exports = { getJwtSecret };
