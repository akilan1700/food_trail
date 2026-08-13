// File: src/app.js
// Description: Main Express application configuration, middleware, and route mounting.
// Author: Akilan M
// Created: 2026-08-11T17:37:59+05:30

const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');

// Route imports (to be created)
const dishRoutes = require('./routes/dishRoutes');
const restaurantRoutes = require('./routes/restaurantRoutes');
const trailRoutes = require('./routes/trailRoutes');
const tripRoutes = require('./routes/tripRoutes');
const uploadRoutes = require('./routes/uploadRoutes');
const authRoutes = require('./routes/authRoutes');

const app = express();

// Standard middleware
app.use(cors());
app.use(express.json());
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
