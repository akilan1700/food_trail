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

    const user = new User({
      email: trimmedEmail,
      name: name.trim(),
      mpin,
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

    // Generate JWT
    const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '7d' });

    const formattedUser = await formatUserResponse(user, userProfile);
    res.status(201).json({
      token,
      user: formattedUser,
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

    if (!mpin) {
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

    // Generate JWT
    const token = jwt.sign({ userId: user._id }, JWT_SECRET, { expiresIn: '7d' });

    let userProfile = await UserProfile.findOne({ userId: user._id });
    if (!userProfile) {
      userProfile = new UserProfile({ userId: user._id });
      await userProfile.save();
    }

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

module.exports = router;
