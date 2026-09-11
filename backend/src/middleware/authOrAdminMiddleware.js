// File: src/middleware/authOrAdminMiddleware.js
// Description: Accepts either a valid user JWT or admin JWT for protected mutating routes.
// Author: Akilan M
// Updated: 2026-09-11

const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Admin = require('../models/Admin');
const { getJwtSecret } = require('../utils/jwtSecret');

/**
 * Authenticates as user (cookie `token` / Bearer) or admin (cookie `admin_token` / Bearer with adminId).
 * Sets `req.user` and/or `req.admin` accordingly.
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
async function authOrAdminMiddleware(req, res, next) {
  try {
    let token = null;
    if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    } else if (req.cookies && req.cookies.admin_token) {
      token = req.cookies.admin_token;
    } else {
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.split(' ')[1];
      }
    }

    if (!token) {
      return res.status(401).json({
        error: { message: 'Authentication required. Token missing.' },
      });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, getJwtSecret());
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({
          error: { message: 'Session expired. Please log in again.' },
        });
      }
      return res.status(401).json({
        error: { message: 'Invalid or expired token.' },
      });
    }

    if (decoded.adminId) {
      const admin = await Admin.findById(decoded.adminId);
      if (!admin) {
        return res.status(403).json({
          error: { message: 'Access denied. Administrator account not found.' },
        });
      }
      req.admin = admin;
      req.tokenPayload = decoded;
      return next();
    }

    if (decoded.userId) {
      const user = await User.findById(decoded.userId);
      if (!user) {
        return res.status(401).json({
          error: { message: 'User account no longer exists.' },
        });
      }
      req.user = user;
      req.tokenPayload = decoded;
      return next();
    }

    return res.status(401).json({
      error: { message: 'Invalid token payload.' },
    });
  } catch (error) {
    console.error('Auth or admin middleware error:', error);
    return res.status(500).json({
      error: { message: 'Internal server error during authentication.' },
    });
  }
}

module.exports = authOrAdminMiddleware;
