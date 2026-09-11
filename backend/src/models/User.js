// File: src/models/User.js
// Description: Mongoose schema representing the user profiles and settings configurations.
// Author: Akilan M
// Updated: 2026-09-11

const mongoose = require('mongoose');
const { hashMpin, compareMpin, isHashedMpin } = require('../utils/mpinCrypto');

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

userSchema.pre('save', function (next) {
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
 * Compares entered MPIN with stored hashed MPIN.
 * @param {string|number} candidateMpin - Plaintext MPIN
 * @returns {boolean}
 */
userSchema.methods.compareMpin = function (candidateMpin) {
  return compareMpin(candidateMpin, this.mpin);
};

/**
 * Re-hashes MPIN to current algorithm if still on legacy iteration count.
 * Call after successful login when compare succeeds.
 * @returns {Promise<boolean>} True if rehash was saved
 */
userSchema.methods.upgradeMpinHashIfNeeded = async function (plainMpin) {
  if (typeof this.mpin === 'string' && this.mpin.startsWith('v1:')) {
    return false;
  }
  this.mpin = hashMpin(plainMpin);
  await this.save();
  return true;
};

module.exports = mongoose.model('User', userSchema);
