// File: src/models/Admin.js
// Description: Mongoose schema representing platform administrators with hashed MPIN authentication.
// Author: Akilan M
// Created: 2026-09-10T11:25:30+05:30

const mongoose = require('mongoose');
const crypto = require('crypto');

const adminSchema = new mongoose.Schema({
  email: {
    type: String,
    required: [true, 'Admin email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    index: true,
  },
  name: {
    type: String,
    required: [true, 'Admin name is required'],
    trim: true,
  },
  mpin: {
    type: String,
    required: [true, 'Admin MPIN is required'],
  },
  role: {
    type: String,
    enum: ['admin', 'superadmin'],
    default: 'admin',
  },
  lastLogin: {
    type: Date,
    default: null,
  },
}, {
  timestamps: true,
});

/**
 * Pre-save hook to hash the administrator MPIN using PBKDF2 with salt.
 */
adminSchema.pre('save', function (next) {
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

/**
 * Compares an entered candidate MPIN with the stored hashed MPIN.
 * @param {string|number} candidateMpin - The MPIN candidate string or number to verify.
 * @returns {boolean} True if matching, false otherwise.
 */
adminSchema.methods.compareMpin = function (candidateMpin) {
  try {
    if (!this.mpin) return false;
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

module.exports = mongoose.model('Admin', adminSchema);
