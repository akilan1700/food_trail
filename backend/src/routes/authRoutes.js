// File: src/routes/authRoutes.js
// Description: User authentication routes (signup, login, OTP, profile, MPIN reset, account delete).
// Author: Akilan M
// Updated: 2026-09-11

const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Otp = require('../models/Otp');
const UserProfile = require('../models/UserProfile');
const Restaurant = require('../models/Restaurant');
const Review = require('../models/Review');
const authMiddleware = require('../middleware/authMiddleware');
const { sendOtpEmail } = require('../services/emailService');
const { getJwtSecret } = require('../utils/jwtSecret');
const { hashMpin } = require('../utils/mpinCrypto');

const router = express.Router();

const SESSION_MS = 7 * 24 * 60 * 60 * 1000;
const SESSION_EXPIRES = '7d';

const isValidEmail = (email) => {
  return typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

/**
 * Issues JWT and sets HttpOnly cookie.
 * @param {import('express').Response} res
 * @param {object} user
 * @returns {string} token
 */
function issueSession(res, user) {
  const token = jwt.sign({ userId: user._id }, getJwtSecret(), { expiresIn: SESSION_EXPIRES });
  res.cookie('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    maxAge: SESSION_MS,
  });
  return token;
}

/**
 * @route POST /api/auth/signup
 * @desc Sign up with email, name, and mpin (OTP required; MPIN stored hashed on OTP)
 */
router.post('/signup', async (req, res, next) => {
  try {
    const { email, name, mpin } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: { message: 'Name is required' } });
    }

    if (!email || !isValidEmail(email)) {
      return res.status(400).json({ error: { message: 'A valid email address is required' } });
    }

    if (!mpin || typeof mpin !== 'string' || !/^\d{4}$|^\d{6}$/.test(mpin)) {
      return res.status(400).json({ error: { message: 'MPIN must be a 4-digit or 6-digit number' } });
    }

    const trimmedEmail = email.trim().toLowerCase();

    const existingUser = await User.findOne({ email: trimmedEmail });
    if (existingUser) {
      return res.status(400).json({ error: { message: 'Email address is already registered' } });
    }

    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    await Otp.deleteMany({ email: trimmedEmail, type: 'signup' });

    const otpRecord = new Otp({
      email: trimmedEmail,
      otp: otpCode,
      type: 'signup',
      name: name.trim(),
      mpin: hashMpin(mpin),
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    });
    await otpRecord.save();

    await sendOtpEmail(trimmedEmail, otpCode, 'signup');

    res.status(200).json({
      status: 'otp_required',
      email: trimmedEmail,
      type: 'signup',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route POST /api/auth/login
 * @desc Log in with email and mpin
 */
router.post('/login', async (req, res, next) => {
  try {
    const { email, mpin } = req.body;

    if (!email || !isValidEmail(email)) {
      return res.status(400).json({ error: { message: 'A valid email address is required' } });
    }

    if (mpin === undefined || mpin === null || mpin === '') {
      return res.status(400).json({ error: { message: 'MPIN is required' } });
    }

    const trimmedEmail = email.trim().toLowerCase();
    const user = await User.findOne({ email: trimmedEmail });
    if (!user) {
      return res.status(401).json({ error: { message: 'Invalid email or MPIN' } });
    }

    const isMatch = user.compareMpin(mpin);
    if (!isMatch) {
      return res.status(401).json({ error: { message: 'Invalid email or MPIN' } });
    }

    if (typeof user.upgradeMpinHashIfNeeded === 'function') {
      await user.upgradeMpinHashIfNeeded(mpin);
    }

    const token = issueSession(res, user);

    let userProfile = await UserProfile.findOne({ userId: user._id });
    if (!userProfile) {
      userProfile = new UserProfile({ userId: user._id });
      await userProfile.save();
    }

    const formattedUser = await formatUserResponse(user, userProfile);
    res.status(200).json({
      token,
      expiresIn: SESSION_MS / 1000,
      user: formattedUser,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route POST /api/auth/verify
 * @desc Verify OTP and complete signup
 */
router.post('/verify', async (req, res, next) => {
  try {
    const { email, otp, type } = req.body;

    if (!email || !isValidEmail(email)) {
      return res.status(400).json({ error: { message: 'A valid email address is required' } });
    }

    if (!otp) {
      return res.status(400).json({ error: { message: 'OTP is required' } });
    }

    if (!type || type !== 'signup') {
      return res.status(400).json({ error: { message: 'Invalid verification type' } });
    }

    const trimmedEmail = email.trim().toLowerCase();

    const otpRecord = await Otp.findOne({
      email: trimmedEmail,
      otp: otp.trim(),
      type: 'signup',
    });

    if (!otpRecord) {
      return res.status(400).json({ error: { message: 'Invalid or expired verification code' } });
    }

    const existingUser = await User.findOne({ email: trimmedEmail });
    if (existingUser) {
      await Otp.deleteMany({ email: trimmedEmail });
      return res.status(400).json({ error: { message: 'Email address is already registered' } });
    }

    const user = new User({
      email: trimmedEmail,
      name: otpRecord.name,
      mpin: otpRecord.mpin,
      settings: {
        notificationsEnabled: true,
        preferredTheme: 'Dark',
      },
    });
    user._skipMpinHash = true;
    await user.save();

    const userProfile = new UserProfile({
      userId: user._id,
      phoneNumber: '',
      bio: '',
      dateOfBirth: null,
      city: '',
      favoriteCuisine: '',
    });
    await userProfile.save();

    await Otp.deleteMany({ email: trimmedEmail });

    const token = issueSession(res, user);
    const formattedUser = await formatUserResponse(user, userProfile);
    res.status(200).json({
      token,
      expiresIn: SESSION_MS / 1000,
      user: formattedUser,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route POST /api/auth/resend-otp
 * @desc Resend signup or reset_mpin OTP
 */
router.post('/resend-otp', async (req, res, next) => {
  try {
    const { email, type } = req.body;
    if (!email || !isValidEmail(email)) {
      return res.status(400).json({ error: { message: 'A valid email address is required' } });
    }
    const otpType = type === 'reset_mpin' ? 'reset_mpin' : 'signup';
    const trimmedEmail = email.trim().toLowerCase();

    const existing = await Otp.findOne({ email: trimmedEmail, type: otpType }).sort({ createdAt: -1 });
    if (!existing) {
      return res.status(400).json({ error: { message: 'No pending verification found for this email' } });
    }

    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    existing.otp = otpCode;
    existing.expiresAt = new Date(Date.now() + 10 * 60 * 1000);
    await existing.save();

    await sendOtpEmail(trimmedEmail, otpCode, otpType === 'reset_mpin' ? 'reset' : 'signup');

    res.status(200).json({ status: 'otp_resent', email: trimmedEmail, type: otpType });
  } catch (error) {
    next(error);
  }
});

/**
 * @route POST /api/auth/forgot-mpin
 * @desc Start MPIN reset via email OTP
 */
router.post('/forgot-mpin', async (req, res, next) => {
  try {
    const { email } = req.body;
    if (!email || !isValidEmail(email)) {
      return res.status(400).json({ error: { message: 'A valid email address is required' } });
    }
    const trimmedEmail = email.trim().toLowerCase();
    const user = await User.findOne({ email: trimmedEmail });

    // Always return success-shaped response to avoid email enumeration
    if (!user) {
      return res.status(200).json({ status: 'otp_required', email: trimmedEmail, type: 'reset_mpin' });
    }

    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();
    await Otp.deleteMany({ email: trimmedEmail, type: 'reset_mpin' });
    await Otp.create({
      email: trimmedEmail,
      otp: otpCode,
      type: 'reset_mpin',
      expiresAt: new Date(Date.now() + 10 * 60 * 1000),
    });
    await sendOtpEmail(trimmedEmail, otpCode, 'reset');

    res.status(200).json({ status: 'otp_required', email: trimmedEmail, type: 'reset_mpin' });
  } catch (error) {
    next(error);
  }
});

/**
 * @route POST /api/auth/reset-mpin
 * @desc Complete MPIN reset with OTP + new MPIN
 */
router.post('/reset-mpin', async (req, res, next) => {
  try {
    const { email, otp, mpin } = req.body;
    if (!email || !isValidEmail(email)) {
      return res.status(400).json({ error: { message: 'A valid email address is required' } });
    }
    if (!otp) {
      return res.status(400).json({ error: { message: 'OTP is required' } });
    }
    if (!mpin || typeof mpin !== 'string' || !/^\d{4}$|^\d{6}$/.test(mpin)) {
      return res.status(400).json({ error: { message: 'MPIN must be a 4-digit or 6-digit number' } });
    }

    const trimmedEmail = email.trim().toLowerCase();
    const otpRecord = await Otp.findOne({
      email: trimmedEmail,
      otp: String(otp).trim(),
      type: 'reset_mpin',
    });
    if (!otpRecord) {
      return res.status(400).json({ error: { message: 'Invalid or expired verification code' } });
    }

    const user = await User.findOne({ email: trimmedEmail });
    if (!user) {
      return res.status(404).json({ error: { message: 'User not found' } });
    }

    user.mpin = mpin;
    await user.save();
    await Otp.deleteMany({ email: trimmedEmail, type: 'reset_mpin' });

    res.status(200).json({ message: 'MPIN updated successfully' });
  } catch (error) {
    next(error);
  }
});

/**
 * @route DELETE /api/auth/account
 * @desc Delete authenticated user account and related profile/reviews
 */
router.delete('/account', authMiddleware, async (req, res, next) => {
  try {
    const userId = req.user._id;
    await Review.deleteMany({ user: userId });
    await UserProfile.deleteMany({ userId });
    await User.findByIdAndDelete(userId);
    res.clearCookie('token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
    });
    res.status(200).json({ message: 'Account deleted successfully' });
  } catch (error) {
    next(error);
  }
});

/**
 * @route GET /api/auth/profile
 */
router.get('/profile', authMiddleware, async (req, res, next) => {
  try {
    let userProfile = await UserProfile.findOne({ userId: req.user._id });
    if (!userProfile) {
      userProfile = new UserProfile({ userId: req.user._id });
      await userProfile.save();
    }

    const formattedUser = await formatUserResponse(req.user, userProfile);
    res.status(200).json({ user: formattedUser });
  } catch (error) {
    next(error);
  }
});

/**
 * @route PUT /api/auth/profile
 */
router.put('/profile', authMiddleware, async (req, res, next) => {
  try {
    const { name, settings, profile } = req.body;
    const user = req.user;

    if (name !== undefined) {
      if (!name.trim()) {
        return res.status(400).json({ error: { message: 'Name cannot be empty' } });
      }
      user.name = name.trim();
    }

    if (settings !== undefined) {
      if (settings.notificationsEnabled !== undefined) {
        user.settings.notificationsEnabled = !!settings.notificationsEnabled;
      }
      if (settings.preferredTheme !== undefined) {
        if (!['Dark', 'Light'].includes(settings.preferredTheme)) {
          return res.status(400).json({ error: { message: 'Invalid theme configuration' } });
        }
        user.settings.preferredTheme = settings.preferredTheme;
      }
    }

    await user.save();

    let userProfile = await UserProfile.findOne({ userId: user._id });
    if (!userProfile) {
      userProfile = new UserProfile({ userId: user._id });
    }

    if (profile !== undefined) {
      if (profile.phoneNumber !== undefined) {
        userProfile.phoneNumber = String(profile.phoneNumber).trim();
      }
      if (profile.bio !== undefined) {
        userProfile.bio = String(profile.bio).trim();
      }
      if (profile.dateOfBirth !== undefined) {
        userProfile.dateOfBirth = profile.dateOfBirth ? new Date(profile.dateOfBirth) : null;
      }
      if (profile.city !== undefined) {
        userProfile.city = String(profile.city).trim();
      }
      if (profile.favoriteCuisine !== undefined) {
        userProfile.favoriteCuisine = String(profile.favoriteCuisine).trim();
      }
      await userProfile.save();
    }

    const formattedUser = await formatUserResponse(user, userProfile);
    res.status(200).json({ user: formattedUser });
  } catch (error) {
    next(error);
  }
});

/**
 * @route POST /api/auth/profile/complete-walk
 */
router.post('/profile/complete-walk', authMiddleware, async (req, res, next) => {
  try {
    const { trailId } = req.body;

    let userProfile = await UserProfile.findOne({ userId: req.user._id });
    if (!userProfile) {
      userProfile = new UserProfile({ userId: req.user._id });
    }

    userProfile.walksCompletedCount = (userProfile.walksCompletedCount || 0) + 1;

    if (trailId) {
      if (!userProfile.completedTrails) {
        userProfile.completedTrails = [];
      }
      const mongoose = require('mongoose');
      if (mongoose.Types.ObjectId.isValid(trailId)) {
        if (!userProfile.completedTrails.includes(trailId)) {
          userProfile.completedTrails.push(trailId);
        }
      }
    }

    await userProfile.save();

    const formattedUser = await formatUserResponse(req.user, userProfile);
    res.status(200).json({ user: formattedUser });
  } catch (error) {
    next(error);
  }
});

/**
 * Formats user response with profile statistics.
 * @param {object} user
 * @param {object} userProfile
 */
async function formatUserResponse(user, userProfile) {
  const cafesDiscovered = await Restaurant.countDocuments({ createdBy: user._id });
  const walksCompleted = userProfile ? (userProfile.walksCompletedCount || 0) : 0;

  return {
    id: user._id,
    email: user.email,
    name: user.name,
    settings: user.settings,
    createdAt: user.createdAt,
    profile: {
      phoneNumber: userProfile ? (userProfile.phoneNumber || '') : '',
      bio: userProfile ? (userProfile.bio || '') : '',
      dateOfBirth: userProfile ? userProfile.dateOfBirth : null,
      city: userProfile ? (userProfile.city || '') : '',
      favoriteCuisine: userProfile ? (userProfile.favoriteCuisine || '') : '',
      walksCompleted,
      cafesDiscovered,
    },
  };
}

/**
 * @route POST /api/auth/logout
 */
router.post('/logout', (req, res) => {
  res.clearCookie('token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
  });
  res.status(200).json({ message: 'Logged out successfully' });
});

module.exports = router;
