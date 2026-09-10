// File: src/models/Dish.js
// Description: Dish Mongoose schema representing specific menu items, prices, and links to their restaurants.
// Author: Akilan M
// Created: 2026-08-11T17:37:16+05:30

const mongoose = require('mongoose');

const dishSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  description: {
    type: String,
    trim: true,
  },
  price: {
    type: Number,
    required: true,
    min: 0,
  },
  photoUrl: {
    type: String,
    trim: true,
  },
  restaurantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Restaurant',
    required: true,
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
  isSignature: {
    type: Boolean,
    default: false,
  },
}, {
  timestamps: true,
});

// Index for text searching on dish name
dishSchema.index({ name: 'text', description: 'text' });

module.exports = mongoose.model('Dish', dishSchema);
