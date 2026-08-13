// File: src/models/User.js
// Description: Mongoose schema representing the user profiles and settings configurations.
// Author: Akilan M
// Created: 2026-08-13T10:57:30+05:30

const mongoose = require('mongoose');

const crypto = require('crypto');

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
  mpin: {
    type: String,
    required: [true, 'MPIN is required'],
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

// Hash the MPIN before saving
userSchema.pre('save', function (next) {
  if (!this.isModified('mpin')) {
    return next();
  }
  try {
    const salt = crypto.randomBytes(16).toString('hex');
    const mpinStr = String(this.mpin);
    const hash = crypto.pbkdf2Sync(mpinStr, salt, 1000, 64, 'sha512').toString('hex');
    this.mpin = `${salt}:${hash}`;
    next();
  } catch (err) {
    next(err);
  }
});

// Compare entered MPIN with stored hashed MPIN
userSchema.methods.compareMpin = function (candidateMpin) {
  try {
    const parts = this.mpin.split(':');
    if (parts.length !== 2) return false;
    const [salt, originalHash] = parts;
    const mpinStr = String(candidateMpin);
    const hash = crypto.pbkdf2Sync(mpinStr, salt, 1000, 64, 'sha512').toString('hex');
    return hash === originalHash;
  } catch (err) {
    return false;
  }
};

module.exports = mongoose.model('User', userSchema);
