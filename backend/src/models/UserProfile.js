// File: src/models/UserProfile.js
// Description: Mongoose schema representing the user profiles containing metadata like phoneNumber, bio, dateOfBirth, city, and favoriteCuisine.
// Author: Akilan M
// Created: 2026-08-13T11:24:30+05:30

const mongoose = require('mongoose');

const userProfileSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required'],
    unique: true,
    index: true,
  },
  phoneNumber: {
    type: String,
    trim: true,
    default: '',
  },
  bio: {
    type: String,
    trim: true,
    default: '',
  },
  dateOfBirth: {
    type: Date,
    default: null,
  },
  city: {
    type: String,
    trim: true,
    default: '',
  },
  favoriteCuisine: {
    type: String,
    trim: true,
    default: '',
  },
}, {
  timestamps: true,
});

module.exports = mongoose.model('UserProfile', userProfileSchema);
