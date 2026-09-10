// File: src/middleware/authMiddleware.js
// Description: Express middleware for JWT verification and user authentication binding.
// Author: Akilan M
// Created: 2026-08-13T11:06:50+05:30

const jwt = require('jsonwebtoken');
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET || 'foodtrail-super-secret-key-change-in-prod';

/**
 * Express middleware to authenticate requests using JSON Web Tokens (JWT).
 * Expects header: Authorization: Bearer <token>
 */
async function authMiddleware(req, res, next) {
  try {
    let token = null;

    // 1. Try to read from cookies first
    if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    } 
    // 2. Fall back to Authorization Header
    else {
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.split(' ')[1];
      }
    }

    if (!token) {
      return res.status(401).json({
        error: { message: 'Authentication required. Token missing.' }
      });
    }

    let decoded;
    try {
      decoded = jwt.verify(token, JWT_SECRET);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({
          error: { message: 'Session expired after 1 hour. Please log in again.' }
        });
      }
      return res.status(401).json({
        error: { message: 'Invalid or expired token.' }
      });
    }

    const user = await User.findById(decoded.userId);
    if (!user) {
      return res.status(401).json({
        error: { message: 'User account no longer exists.' }
      });
    }

    // Attach user and token payload to the request
    req.user = user;
    req.tokenPayload = decoded;
    
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(500).json({
      error: { message: 'Internal server error during authentication.' }
    });
  }
}

module.exports = authMiddleware;
