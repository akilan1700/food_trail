// File: src/routes/authRoutes.js
// Description: Express routes for user authentication (signup request, login request, verify, profile details, settings).
// Author: Akilan M
// Created: 2026-08-13T11:09:40+05:30

const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Otp = require('../models/Otp');
const UserProfile = require('../models/UserProfile');
const { sendOtpEmail } = require('../services/emailService');
const authMiddleware = require('../middleware/authMiddleware');

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'foodtrail-super-secret-key-change-in-prod';

// Simple email regex validation helper
const isValidEmail = (email) => {
  return typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

/**
 * @route POST /api/auth/signup/request
 * @desc Request OTP for new user registration
 */
router.post('/signup/request', async (req, res, next) => {
  try {
    const { email, name } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: { message: 'Name is required' } });
    }

    if (!email || !isValidEmail(email)) {
      return res.status(400).json({ error: { message: 'A valid email address is required' } });
    }

    const trimmedEmail = email.trim().toLowerCase();

    // Check if user already exists
    const existingUser = await User.findOne({ email: trimmedEmail });
    if (existingUser) {
      return res.status(400).json({ error: { message: 'Email address is already registered' } });
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now

    // Clear old OTPs and save new one
    await Otp.deleteMany({ email: trimmedEmail });
    const newOtp = new Otp({
      email: trimmedEmail,
      otp,
      type: 'signup',
      name: name.trim(),
      expiresAt,
    });
    await newOtp.save();

    // Send email
    await sendOtpEmail(trimmedEmail, otp, 'signup');

    res.status(200).json({ message: 'Verification OTP sent to your email.' });
  } catch (error) {
    next(error);
  }
});

/**
 * @route POST /api/auth/login/request
 * @desc Request OTP for existing user sign in
 */
router.post('/login/request', async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email || !isValidEmail(email)) {
      return res.status(400).json({ error: { message: 'A valid email address is required' } });
    }

    const trimmedEmail = email.trim().toLowerCase();

    // Check if user exists
    const user = await User.findOne({ email: trimmedEmail });
    if (!user) {
      return res.status(404).json({ error: { message: 'User not found. Please sign up first.' } });
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Clear old OTPs and save new one
    await Otp.deleteMany({ email: trimmedEmail });
    const newOtp = new Otp({
      email: trimmedEmail,
      otp,
      type: 'login',
      expiresAt,
    });
    await newOtp.save();

    // Send email
    await sendOtpEmail(trimmedEmail, otp, 'login');

    res.status(200).json({ message: 'Verification OTP sent to your email.' });
  } catch (error) {
    next(error);
  }
});

/**
 * @route POST /api/auth/verify
 * @desc Verify OTP and complete authentication (issue JWT)
 */
router.post('/verify', async (req, res, next) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ error: { message: 'Email and verification OTP are required' } });
    }

    const trimmedEmail = email.trim().toLowerCase();
    const cleanOtp = otp.trim();

    // Find the latest OTP record
    const record = await Otp.findOne({ email: trimmedEmail, otp: cleanOtp });
    if (!record) {
      return res.status(400).json({ error: { message: 'Invalid verification code' } });
    }

    // Explicit expiration check
    if (record.expiresAt < new Date()) {
      await Otp.deleteOne({ _id: record._id });
      return res.status(400).json({ error: { message: 'Verification code has expired' } });
    }

    let user;

    if (record.type === 'signup') {
      // Create user if not already exists (safe checks)
      user = await User.findOne({ email: trimmedEmail });
      if (!user) {
        user = new User({
          email: trimmedEmail,
          name: record.name,
          settings: {
            notificationsEnabled: true,
            preferredTheme: 'Dark',
          },
        });
        await user.save();

        // Create linked profile
        const userProfile = new UserProfile({
          userId: user._id,
          phoneNumber: '',
          bio: '',
          dateOfBirth: null,
          city: '',
          favoriteCuisine: '',
        });
        await userProfile.save();
      }
    } else {
      // Fetch user for login
      user = await User.findOne({ email: trimmedEmail });
      if (!user) {
        return res.status(404).json({ error: { message: 'User account not found' } });
      }
    }

    // Authenticated! Clean up OTP record
    await Otp.deleteMany({ email: trimmedEmail });

    // Generate JWT
    const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '7d' });

    let userProfile = await UserProfile.findOne({ userId: user._id });
    if (!userProfile) {
      userProfile = new UserProfile({ userId: user._id });
      await userProfile.save();
    }

    res.status(200).json({
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        settings: user.settings,
        createdAt: user.createdAt,
        profile: {
          phoneNumber: userProfile.phoneNumber || '',
          bio: userProfile.bio || '',
          dateOfBirth: userProfile.dateOfBirth,
          city: userProfile.city || '',
          favoriteCuisine: userProfile.favoriteCuisine || '',
        },
      },
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

    res.status(200).json({
      user: {
        id: req.user._id,
        email: req.user.email,
        name: req.user.name,
        settings: req.user.settings,
        createdAt: req.user.createdAt,
        profile: {
          phoneNumber: userProfile.phoneNumber || '',
          bio: userProfile.bio || '',
          dateOfBirth: userProfile.dateOfBirth,
          city: userProfile.city || '',
          favoriteCuisine: userProfile.favoriteCuisine || '',
        },
      },
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

    res.status(200).json({
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        settings: user.settings,
        createdAt: user.createdAt,
        profile: {
          phoneNumber: userProfile.phoneNumber || '',
          bio: userProfile.bio || '',
          dateOfBirth: userProfile.dateOfBirth,
          city: userProfile.city || '',
          favoriteCuisine: userProfile.favoriteCuisine || '',
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
