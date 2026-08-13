// File: src/models/User.js
// Description: Mongoose schema representing the user profiles and settings configurations.
// Author: Akilan M
// Created: 2026-08-13T10:57:30+05:30

const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    index: true,
  },
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
  },
  settings: {
    notificationsEnabled: {
      type: Boolean,
      default: true,
    },
    preferredTheme: {
      type: String,
      enum: ['Dark', 'Light'],
      default: 'Dark',
    },
  },
}, {
  timestamps: true,
});

module.exports = mongoose.model('User', userSchema);
