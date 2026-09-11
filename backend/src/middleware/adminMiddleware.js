// File: src/middleware/adminMiddleware.js
// Description: Express middleware ensuring request has a valid JWT belonging to a registered Administrator.
// Author: Akilan M
// Updated: 2026-09-11

const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');
const { getJwtSecret } = require('../utils/jwtSecret');

/**
 * Express middleware to authenticate requests from Administrators.
 * Reads token from Authorization Bearer header or `admin_token` cookie.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
async function adminMiddleware(req, res, next) {
  try {
    let token = null;

    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    } else if (req.cookies && req.cookies.admin_token) {
      token = req.cookies.admin_token;
    }

    if (!token) {
      return res.status(401).json({
        error: { message: 'Administrator authentication required. Token missing.' },
      });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, getJwtSecret());
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({
          error: { message: 'Admin session expired. Please log in again.' },
        });
      }
      return res.status(401).json({
        error: { message: 'Invalid or expired administrator token.' },
      });
    }

    if (!decoded.adminId) {
      return res.status(403).json({
        error: { message: 'Access denied. Token is not an administrator credential.' },
      });
    }

    const admin = await Admin.findById(decoded.adminId);
    if (!admin) {
      return res.status(403).json({
        error: { message: 'Access denied. Administrator account not found.' },
      });
    }

    req.admin = admin;
    req.tokenPayload = decoded;

    next();
  } catch (error) {
    console.error('Admin middleware authentication error:', error);
    res.status(500).json({
      error: { message: 'Internal server error during admin authentication.' },
    });
  }
}

module.exports = adminMiddleware;
