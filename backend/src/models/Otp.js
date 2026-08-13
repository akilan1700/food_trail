// File: src/models/Otp.js
// Description: Mongoose schema representing the verification OTPs with auto-expiring TTL configuration.
// Author: Akilan M
// Created: 2026-08-13T10:59:15+05:30

const mongoose = require('mongoose');

const otpSchema = new mongoose.Schema({
  email: {
    type: String,
    required: [true, 'Email is required'],
    lowercase: true,
    trim: true,
    index: true,
  },
  otp: {
    type: String,
    required: [true, 'OTP is required'],
  },
  type: {
    type: String,
    enum: ['signup', 'login'],
    required: [true, 'OTP type is required'],
  },
  name: {
    type: String,
    trim: true,
  },
  mpin: {
    type: String,
  },
  expiresAt: {
    type: Date,
    required: [true, 'Expiration time is required'],
    index: { expires: 0 }, // Document will be deleted at expiresAt time
  },
}, {
  timestamps: true,
});

module.exports = mongoose.model('Otp', otpSchema);
