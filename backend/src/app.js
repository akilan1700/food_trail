// File: src/app.js
// Description: Main Express application configuration, middleware, and route mounting.
// Author: Akilan M
// Created: 2026-08-11T17:37:59+05:30
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const cookieParser = require('cookie-parser');

// Route imports (to be created)
const dishRoutes = require('./routes/dishRoutes');
const restaurantRoutes = require('./routes/restaurantRoutes');
const trailRoutes = require('./routes/trailRoutes');
const tripRoutes = require('./routes/tripRoutes');
const uploadRoutes = require('./routes/uploadRoutes');
const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes');
const reviewRoutes = require('./routes/reviewRoutes');

const app = express();

// Parse allowed origins strictly from environment variables
const parseOrigins = (val) => (val ? val.split(',').map((s) => s.trim().replace(/\/$/, '')).filter(Boolean) : []);

const envFrontendOrigins = parseOrigins(process.env.FRONTEND_URL);
const envAdminOrigins = parseOrigins(process.env.ADMIN_FRONTEND_URL);
const envAllowedOrigins = parseOrigins(process.env.ALLOWED_ORIGINS);

const explicitEnvOrigins = [
  ...envFrontendOrigins,
  ...envAdminOrigins,
  ...envAllowedOrigins,
];

// Fallback for local development only if no env origins are explicitly configured
const defaultLocalOrigins = ['http://localhost:3000', 'http://localhost:3001'];
const allowedOriginsList = explicitEnvOrigins.length > 0
  ? explicitEnvOrigins
  : (process.env.NODE_ENV === 'production' ? [] : defaultLocalOrigins);

const configuredOrigins = new Set(allowedOriginsList);

// Standard middleware
app.use(cors({
  origin: function (origin, callback) {
    // Allow non-browser requests (e.g. server-to-server, health check, curl) without origin header
    if (!origin) {
      return callback(null, true);
    }

    const cleanOrigin = origin.replace(/\/$/, '');
    if (configuredOrigins.has(cleanOrigin)) {
      callback(null, true);
    } else {
      callback(new Error(`Blocked by CORS: origin '${origin}' is not in configured environment whitelist.`));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
}));
app.use(express.json());
app.use(cookieParser());
app.use(morgan('dev'));

// Static serving for local photo uploads fallback
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// Mount routes
app.use('/api/dishes', dishRoutes);
app.use('/api/restaurants', restaurantRoutes);
app.use('/api/trails', trailRoutes);
app.use('/api/trips', tripRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/reviews', reviewRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date() });
});

// Centralized error handler
app.use((err, req, res, next) => {
  console.error('Unhandled Error:', err);
  res.status(err.status || 500).json({
    error: {
      message: err.message || 'Internal Server Error',
    },
  });
});

module.exports = app;
