// File: src/app.js
// Description: Main Express application configuration, security middleware, and route mounting.
// Author: Akilan M
// Updated: 2026-09-11

const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const cookieParser = require('cookie-parser');

const dishRoutes = require('./routes/dishRoutes');
const restaurantRoutes = require('./routes/restaurantRoutes');
const trailRoutes = require('./routes/trailRoutes');
const tripRoutes = require('./routes/tripRoutes');
const uploadRoutes = require('./routes/uploadRoutes');
const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes');
const reviewRoutes = require('./routes/reviewRoutes');
const { getJwtSecret } = require('./utils/jwtSecret');

// Fail fast if JWT cannot be resolved (production requires JWT_SECRET)
getJwtSecret();

const app = express();

const parseOrigins = (val) => (val ? val.split(',').map((s) => s.trim().replace(/\/$/, '')).filter(Boolean) : []);

const envFrontendOrigins = parseOrigins(process.env.FRONTEND_URL);
const envAdminOrigins = parseOrigins(process.env.ADMIN_FRONTEND_URL);
const envAllowedOrigins = parseOrigins(process.env.ALLOWED_ORIGINS);

const explicitEnvOrigins = [
  ...envFrontendOrigins,
  ...envAdminOrigins,
  ...envAllowedOrigins,
];

const defaultLocalOrigins = ['http://localhost:3000', 'http://localhost:3001'];
const allowedOriginsList = explicitEnvOrigins.length > 0
  ? explicitEnvOrigins
  : (process.env.NODE_ENV === 'production' ? [] : defaultLocalOrigins);

if (process.env.NODE_ENV === 'production' && allowedOriginsList.length === 0) {
  throw new Error(
    'Production requires FRONTEND_URL, ADMIN_FRONTEND_URL, or ALLOWED_ORIGINS to be set for CORS'
  );
}

const configuredOrigins = new Set(allowedOriginsList);

app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) {
      return callback(null, true);
    }
    const cleanOrigin = origin.replace(/\/$/, '');
    if (configuredOrigins.has(cleanOrigin)) {
      return callback(null, true);
    }
    // Reject quietly (no thrown Error that becomes a 500 CORS failure)
    return callback(null, false);
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
}));

app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));

const isProd = process.env.NODE_ENV === 'production';
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isProd ? 60 : 1000,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { message: 'Too many auth attempts. Please try again later.' } },
});
const adminLoginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isProd ? 40 : 500,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { message: 'Too many admin login attempts. Please try again later.' } },
});
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: isProd ? 1200 : 20000,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => req.path === '/health' || req.originalUrl === '/health',
});

app.use('/api/auth', authLimiter);
app.use('/api/admin/login', adminLoginLimiter);
app.use('/api', apiLimiter);

app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

app.use('/api/dishes', dishRoutes);
app.use('/api/restaurants', restaurantRoutes);
app.use('/api/trails', trailRoutes);
app.use('/api/trips', tripRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/reviews', reviewRoutes);

app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', timestamp: new Date() });
});

app.use((err, req, res, next) => {
  console.error('Unhandled Error:', {
    message: err.message,
    stack: process.env.NODE_ENV === 'production' ? undefined : err.stack,
  });
  const status = err.status || 500;
  const clientMessage =
    process.env.NODE_ENV === 'production' && status >= 500
      ? 'Internal Server Error'
      : (err.message || 'Internal Server Error');
  res.status(status).json({
    error: {
      message: clientMessage,
    },
  });
});

module.exports = app;
