// File: src/models/SavedTrip.js
// Description: SavedTrip Mongoose schema representing shared trip configurations (saved places and routes).
// Author: Akilan M
// Created: 2026-08-11T17:37:26+05:30

const mongoose = require('mongoose');
const crypto = require('crypto');

const savedTripSchema = new mongoose.Schema({
  shareId: {
    type: String,
    unique: true,
    index: true,
  },
  restaurantIds: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Restaurant',
  }],
  trailId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Trail',
  },
}, {
  timestamps: true,
});

// Pre-save hook to generate a short shareId
savedTripSchema.pre('save', function (next) {
  if (!this.shareId) {
    this.shareId = crypto.randomBytes(4).toString('hex'); // 8 characters, e.g. "a1b2c3d4"
  }
  next();
});

module.exports = mongoose.model('SavedTrip', savedTripSchema);
