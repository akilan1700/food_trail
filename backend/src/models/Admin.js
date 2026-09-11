// File: src/models/Admin.js
// Description: Mongoose schema representing platform administrators with hashed MPIN authentication.
// Author: Akilan M
// Updated: 2026-09-11

const mongoose = require('mongoose');
const { hashMpin, compareMpin, isHashedMpin } = require('../utils/mpinCrypto');

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

adminSchema.pre('save', function (next) {
  if (!this.isModified('mpin')) {
    return next();
  }
  try {
    if (this._skipMpinHash || isHashedMpin(this.mpin)) {
      return next();
    }
    this.mpin = hashMpin(this.mpin);
    next();
  } catch (err) {
    next(err);
  }
});

/**
 * Compares an entered candidate MPIN with the stored hashed MPIN.
 * @param {string|number} candidateMpin - The MPIN candidate to verify.
 * @returns {boolean} True if matching
 */
adminSchema.methods.compareMpin = function (candidateMpin) {
  return compareMpin(candidateMpin, this.mpin);
};

/**
 * Upgrades legacy MPIN hash after successful login.
 * @param {string|number} plainMpin
 * @returns {Promise<boolean>}
 */
adminSchema.methods.upgradeMpinHashIfNeeded = async function (plainMpin) {
  if (typeof this.mpin === 'string' && this.mpin.startsWith('v1:')) {
    return false;
  }
  this.mpin = hashMpin(plainMpin);
  await this.save();
  return true;
};

module.exports = mongoose.model('Admin', adminSchema);
