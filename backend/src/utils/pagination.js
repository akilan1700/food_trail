// File: src/utils/pagination.js
// Description: Helpers for parsing page/limit query params and shaping list responses (backward compatible).
// Author: Akilan M
// Updated: 2026-09-11

const DEFAULT_LIMIT = 100;
const MAX_LIMIT = 500;

/**
 * True when the client explicitly requested pagination via page or limit.
 * @param {object} query - Express req.query
 * @returns {boolean}
 */
function wantsPagination(query = {}) {
  return query.page !== undefined || query.limit !== undefined;
}

/**
 * Parses pagination query parameters with caps.
 * @param {object} query - Express req.query
 * @returns {{ page: number, limit: number, skip: number, paginate: boolean }}
 */
function parsePagination(query = {}) {
  const paginate = wantsPagination(query);
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  let limit = parseInt(query.limit, 10) || DEFAULT_LIMIT;
  if (limit < 1) limit = DEFAULT_LIMIT;
  if (limit > MAX_LIMIT) limit = MAX_LIMIT;
  // When pagination is not requested, return a large page so callers still get full lists
  if (!paginate) {
    return { page: 1, limit: MAX_LIMIT, skip: 0, paginate: false };
  }
  const skip = (page - 1) * limit;
  return { page, limit, skip, paginate: true };
}

/**
 * Builds a consistent paginated JSON payload.
 * @param {Array} data - Page rows
 * @param {{ page: number, limit: number, total: number }} meta
 * @returns {object}
 */
function paginatedResponse(data, { page, limit, total }) {
  return {
    data,
    page,
    limit,
    total,
    totalPages: Math.max(1, Math.ceil(total / limit) || 1),
  };
}

/**
 * Sends either a bare array (legacy) or paginated envelope based on the request.
 * @param {import('express').Response} res
 * @param {Array} rows
 * @param {{ page: number, limit: number, total: number, paginate: boolean }} meta
 */
function sendListResponse(res, rows, meta) {
  if (!meta.paginate) {
    return res.json(rows);
  }
  return res.json(paginatedResponse(rows, meta));
}

module.exports = {
  DEFAULT_LIMIT,
  MAX_LIMIT,
  wantsPagination,
  parsePagination,
  paginatedResponse,
  sendListResponse,
};
