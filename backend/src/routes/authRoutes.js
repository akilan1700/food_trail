// File: src/routes/authRoutes.js
// Description: Express routes for user authentication (signup request, login request, verify, profile details, settings).
// Author: Akilan M
// Created: 2026-08-13T11:09:40+05:30

const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Otp = require('../models/Otp');
const UserProfile = require('../models/UserProfile');
const authMiddleware = require('../middleware/authMiddleware');
const { sendOtpEmail } = require('../services/emailService');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'foodtrail-super-secret-key-change-in-prod';

// Simple email regex validation helper
const isValidEmail = (email) => {
  return typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

/**
 * @route POST /api/auth/signup
 * @desc Sign up with email, name, and mpin
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

    // Check if user already exists
    const existingUser = await User.findOne({ email: trimmedEmail });
    if (existingUser) {
      return res.status(400).json({ error: { message: 'Email address is already registered' } });
    }

    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();

    // Clean old OTP codes for this signup
    await Otp.deleteMany({ email: trimmedEmail, type: 'signup' });

    const otpRecord = new Otp({
      email: trimmedEmail,
      otp: otpCode,
      type: 'signup',
      name: name.trim(),
      mpin: mpin,
      expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
    });
    await otpRecord.save();

    // Send transaction email via Brevo
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

    // Find user
    const user = await User.findOne({ email: trimmedEmail });
    if (!user) {
      return res.status(401).json({ error: { message: 'Invalid email or MPIN' } });
    }

    // Verify MPIN
    const isMatch = user.compareMpin(mpin);
    if (!isMatch) {
      return res.status(401).json({ error: { message: 'Invalid email or MPIN' } });
    }

    const otpCode = Math.floor(100000 + Math.random() * 900000).toString();

    // Clean old OTP codes for this login
    await Otp.deleteMany({ email: trimmedEmail, type: 'login' });

    const otpRecord = new Otp({
      email: trimmedEmail,
      otp: otpCode,
      type: 'login',
      expiresAt: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
    });
    await otpRecord.save();

    // Send transaction email via Brevo
    await sendOtpEmail(trimmedEmail, otpCode, 'login');

    res.status(200).json({
      status: 'otp_required',
      email: trimmedEmail,
      type: 'login',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route POST /api/auth/verify
 * @desc Verify OTP and complete signup or login
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

    if (!type || !['signup', 'login'].includes(type)) {
      return res.status(400).json({ error: { message: 'Invalid verification type' } });
    }

    const trimmedEmail = email.trim().toLowerCase();

    // Find matching valid OTP
    const otpRecord = await Otp.findOne({
      email: trimmedEmail,
      otp: otp.trim(),
      type,
    });

    if (!otpRecord) {
      return res.status(400).json({ error: { message: 'Invalid or expired verification code' } });
    }

    let user;
    let userProfile;

    if (type === 'signup') {
      const existingUser = await User.findOne({ email: trimmedEmail });
      if (existingUser) {
        await Otp.deleteMany({ email: trimmedEmail });
        return res.status(400).json({ error: { message: 'Email address is already registered' } });
      }

      // Create new verified user
      user = new User({
        email: trimmedEmail,
        name: otpRecord.name,
        mpin: otpRecord.mpin,
        settings: {
          notificationsEnabled: true,
          preferredTheme: 'Dark',
        },
      });
      await user.save();

      // Create profile details
      userProfile = new UserProfile({
        userId: user._id,
        phoneNumber: '',
        bio: '',
        dateOfBirth: null,
        city: '',
        favoriteCuisine: '',
      });
      await userProfile.save();
    } else {
      user = await User.findOne({ email: trimmedEmail });
      if (!user) {
        return res.status(404).json({ error: { message: 'User not found' } });
      }

      userProfile = await UserProfile.findOne({ userId: user._id });
      if (!userProfile) {
        userProfile = new UserProfile({ userId: user._id });
        await userProfile.save();
      }
    }

    // Delete used OTP
    await Otp.deleteMany({ email: trimmedEmail });

    // Generate JWT
    const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '7d' });

    // Set secure HttpOnly cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days (matching token expiry)
    });

    const formattedUser = await formatUserResponse(user, userProfile);
    res.status(200).json({
      token,
      user: formattedUser,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route GET /api/auth/profile
 * @desc Get currently authenticated user profile
 */
router.get('/profile', authMiddleware, async (req, res, next) => {
  try {
    let userProfile = await UserProfile.findOne({ userId: req.user._id });
    if (!userProfile) {
      userProfile = new UserProfile({ userId: req.user._id });
      await userProfile.save();
    }

    const formattedUser = await formatUserResponse(req.user, userProfile);
    res.status(200).json({
      user: formattedUser,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route PUT /api/auth/profile
 * @desc Update user profile details / settings
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
    res.status(200).json({
      user: formattedUser,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route POST /api/auth/profile/complete-walk
 * @desc Mark a walking food trail as completed
 */
router.post('/profile/complete-walk', authMiddleware, async (req, res, next) => {
  try {
    const { trailId } = req.body;

    let userProfile = await UserProfile.findOne({ userId: req.user._id });
    if (!userProfile) {
      userProfile = new UserProfile({ userId: req.user._id });
    }

    // Increment overall completed walks count
    userProfile.walksCompletedCount = (userProfile.walksCompletedCount || 0) + 1;

    // Add trailId to completedTrails list if a predefined trail is completed
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
 * Helper to dynamically format user response payload with real database-backed statistics.
 */
async function formatUserResponse(user, userProfile) {
  const Restaurant = require('../models/Restaurant');
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
 * @desc Log out user by clearing the authentication cookie
 */
router.post('/logout', (req, res) => {
  res.clearCookie('token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
  });
  res.status(200).json({ message: 'Logged out successfully' });
});

module.exports = router;
