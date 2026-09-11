// File: src/middleware/authMiddleware.js
// Description: Express middleware for JWT verification and user authentication binding.
// Author: Akilan M
// Updated: 2026-09-11

const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { getJwtSecret } = require('../utils/jwtSecret');

/**
 * Express middleware to authenticate requests using JSON Web Tokens (JWT).
 * Expects cookie `token` or header: Authorization: Bearer <token>
 * @param {import('express').Request} req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
async function authMiddleware(req, res, next) {
  try {
    let token = null;

    if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
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

    if (!decoded.userId) {
      return res.status(401).json({
        error: { message: 'Invalid user token.' },
      });
    }

    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(401).json({
        error: { message: 'User account no longer exists.' },
      });
    }

    req.user = user;
    req.tokenPayload = decoded;

    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({
      error: { message: 'Internal server error during authentication.' },
    });
  }
}

module.exports = authMiddleware;
