// File: src/models/Trail.js
// Description: Trail Mongoose schema representing walking food routes and their sequential restaurant stops.
// Author: Akilan M
// Created: 2026-08-11T17:37:20+05:30

const mongoose = require('mongoose');

const stopSchema = new mongoose.Schema({
  order: {
    type: Number,
    required: true,
  },
  restaurantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Restaurant',
    required: true,
  },
  description: {
    type: String,
    trim: true,
  },
});

const trailSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    trim: true,
  },
  estimatedDuration: {
    type: Number, // in minutes
    required: true,
  },
  distance: {
    type: Number, // in meters
    required: true,
  },
  area: {
    type: String,
    required: true,
    trim: true,
  },
  photoUrl: {
    type: String,
    trim: true,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
    index: true,
  },
  stops: [stopSchema],
}, {
  timestamps: true,
});

module.exports = mongoose.model('Trail', trailSchema);
