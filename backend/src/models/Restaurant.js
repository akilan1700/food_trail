// File: src/models/Restaurant.js
// Description: Restaurant Mongoose schema representing dining spots, their coordinates, and vibes.
// Author: Akilan M
// Created: 2026-08-11T17:37:11+05:30

const mongoose = require('mongoose');

const restaurantSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    trim: true,
  },
  address: {
    type: String,
    trim: true,
  },
  area: {
    type: String,
    required: true,
    trim: true,
  },
  location: {
    type: {
      type: String,
      enum: ['Point'],
      default: 'Point',
    },
    coordinates: {
      type: [Number], // [longitude, latitude]
      required: true,
    },
  },
  vibeTags: {
    type: [String],
    default: [],
  },
  rating: {
    type: Number,
    min: 0,
    max: 5,
    default: 0,
  },
  reviewCount: {
    type: Number,
    min: 0,
    default: 0,
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
}, {
  timestamps: true,
});

// Spatial index for geospatial queries
restaurantSchema.index({ location: '2dsphere' });
restaurantSchema.index({ area: 1 });

module.exports = mongoose.model('Restaurant', restaurantSchema);
