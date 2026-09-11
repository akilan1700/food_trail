// File: src/utils/escapeRegex.js
// Description: Escapes user input for safe use inside RegExp constructors.
// Author: Akilan M
// Updated: 2026-09-11

/**
 * Escapes special RegExp characters in a string.
 * @param {string} value - Raw user input
 * @returns {string} Escaped string safe for RegExp
 */
function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

module.exports = { escapeRegex };
