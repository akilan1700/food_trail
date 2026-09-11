// File: src/models/Otp.js
// Description: Mongoose schema representing verification OTPs with auto-expiring TTL; MPIN stored hashed only.
// Author: Akilan M
// Updated: 2026-09-11

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
    enum: ['signup', 'reset_mpin'],
    required: [true, 'OTP type is required'],
  },
  name: {
    type: String,
    trim: true,
  },
  /** Pre-hashed MPIN (never plaintext). Used for signup completion. */
  mpin: {
    type: String,
  },
  expiresAt: {
    type: Date,
    required: [true, 'Expiration time is required'],
    index: { expires: 0 },
  },
}, {
  timestamps: true,
});

module.exports = mongoose.model('Otp', otpSchema);
