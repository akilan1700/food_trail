// File: src/middleware/adminMiddleware.js
// Description: Express middleware ensuring request has a valid JWT belonging to a registered Administrator in the Admin collection.
// Author: Akilan M
// Created: 2026-09-10T11:25:40+05:30

const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');

const JWT_SECRET = process.env.JWT_SECRET || 'foodtrail-super-secret-key-change-in-prod';

/**
 * Express middleware to authenticate requests from Administrators.
 * Reads token from 'admin_token' cookie or Authorization: Bearer header.
 * Attaches the authenticated admin document to `req.admin`.
 */
async function adminMiddleware(req, res, next) {
  try {
    let token = null;

    // 1. Try to read from admin cookie first
    if (req.cookies && req.cookies.admin_token) {
      token = req.cookies.admin_token;
    } 
    // 2. Fall back to general cookie if set
    else if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }
    // 3. Fall back to Authorization Header
    else {
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.split(' ')[1];
      }
    }

    if (!token) {
      return res.status(401).json({
        error: { message: 'Administrator authentication required. Token missing.' },
      });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({
          error: { message: 'Admin session expired after 1 hour. Please log in again.' },
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

    // Attach admin document and token payload
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
