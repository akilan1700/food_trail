// File: src/routes/adminRoutes.js
// Description: Administrative Express routes for authentication, statistics, restaurant management, and signature dishes.
// Author: Akilan M
// Created: 2026-09-10T11:25:50+05:30

const express = require('express');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const Admin = require('../models/Admin');
const User = require('../models/User');
const Restaurant = require('../models/Restaurant');
const Dish = require('../models/Dish');
const Trail = require('../models/Trail');
const Review = require('../models/Review');
const UserProfile = require('../models/UserProfile');
const adminMiddleware = require('../middleware/adminMiddleware');
const { getJwtSecret } = require('../utils/jwtSecret');
const { parsePagination, sendListResponse } = require('../utils/pagination');
const { recalculateRating } = require('../services/reviewService');

const router = express.Router();
const ADMIN_SESSION_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * @route   POST /api/admin/login
 * @desc    Authenticate administrator using Admin collection credentials only
 * @access  Public
 */
router.post('/login', async (req, res, next) => {
  try {
    const { email, mpin } = req.body;

    if (!email || typeof email !== 'string') {
      return res.status(400).json({ error: { message: 'Admin email is required.' } });
    }

    if (mpin === undefined || mpin === null || mpin === '') {
      return res.status(400).json({ error: { message: 'Admin MPIN is required.' } });
    }

    const trimmedEmail = email.trim().toLowerCase();

    // Query exclusively from the Admin collection
    const admin = await Admin.findOne({ email: trimmedEmail });
    if (!admin) {
      return res.status(401).json({ error: { message: 'Invalid administrator email or MPIN.' } });
    }

    const isMatch = admin.compareMpin(mpin);
    if (!isMatch) {
      return res.status(401).json({ error: { message: 'Invalid administrator email or MPIN.' } });
    }

    admin.lastLogin = new Date();
    await admin.save();

    if (typeof admin.upgradeMpinHashIfNeeded === 'function') {
      await admin.upgradeMpinHashIfNeeded(mpin);
    }

    const token = jwt.sign(
      {
        adminId: admin._id,
        role: admin.role,
        email: admin.email,
        name: admin.name,
      },
      getJwtSecret(),
      { expiresIn: '7d' }
    );

    res.cookie('admin_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      maxAge: ADMIN_SESSION_MS,
    });

    res.status(200).json({
      token,
      expiresIn: ADMIN_SESSION_MS / 1000,
      admin: {
        id: admin._id,
        email: admin.email,
        name: admin.name,
        role: admin.role,
        lastLogin: admin.lastLogin,
      },
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/admin/me
 * @desc    Fetch current logged in administrator profile
 * @access  Admin Private
 */
router.get('/me', adminMiddleware, (req, res) => {
  res.status(200).json({
    admin: {
      id: req.admin._id,
      email: req.admin.email,
      name: req.admin.name,
      role: req.admin.role,
      lastLogin: req.admin.lastLogin,
    },
  });
});

/**
 * @route   POST /api/admin/logout
 * @desc    Log out administrator
 * @access  Public
 */
router.post('/logout', (req, res) => {
  res.clearCookie('admin_token', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
  });
  res.status(200).json({ message: 'Administrator logged out successfully' });
});

/**
 * @route   GET /api/admin/stats
 * @desc    Get system-wide KPI metrics
 * @access  Admin Private
 */
router.get('/stats', adminMiddleware, async (req, res, next) => {
  try {
    const [totalRestaurants, totalDishes, totalSignatureDishes, totalUsers, totalTrails] = await Promise.all([
      Restaurant.countDocuments(),
      Dish.countDocuments(),
      Dish.countDocuments({ isSignature: true }),
      User.countDocuments(),
      Trail.countDocuments(),
    ]);

    res.status(200).json({
      totalRestaurants,
      totalDishes,
      totalSignatureDishes,
      totalUsers,
      totalTrails,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/admin/restaurants
 * @desc    Get all restaurants with dish count and full details
 * @access  Admin Private
 */
router.get('/restaurants', adminMiddleware, async (req, res, next) => {
  try {
    const restaurants = await Restaurant.find().sort({ createdAt: -1 });
    
    // Aggregate dish counts per restaurant
    const dishCounts = await Dish.aggregate([
      { $group: { _id: '$restaurantId', totalDishes: { $sum: 1 }, signatureDishes: { $sum: { $cond: ['$isSignature', 1, 0] } } } },
    ]);

    const dishCountMap = {};
    dishCounts.forEach((d) => {
      dishCountMap[d._id.toString()] = {
        totalDishes: d.totalDishes,
        signatureDishes: d.signatureDishes,
      };
    });

    const enrichedRestaurants = restaurants.map((rest) => {
      const counts = dishCountMap[rest._id.toString()] || { totalDishes: 0, signatureDishes: 0 };
      return {
        ...rest.toObject(),
        totalDishes: counts.totalDishes,
        signatureDishes: counts.signatureDishes,
      };
    });

    res.status(200).json(enrichedRestaurants);
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/admin/restaurants
 * @desc    Create a new restaurant spot from admin panel
 * @access  Admin Private
 */
router.post('/restaurants', adminMiddleware, async (req, res, next) => {
  try {
    const { name, description, address, area, coordinates, vibeTags, photoUrl, busyStatus, rating } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: { message: 'Restaurant name is required.' } });
    }

    if (!area || typeof area !== 'string' || !area.trim()) {
      return res.status(400).json({ error: { message: 'Area is required.' } });
    }

    if (!coordinates || !Array.isArray(coordinates) || coordinates.length !== 2) {
      return res.status(400).json({ error: { message: 'Coordinates are required as [longitude, latitude].' } });
    }

    const [longitude, latitude] = coordinates.map(Number);
    if (isNaN(longitude) || isNaN(latitude)) {
      return res.status(400).json({ error: { message: 'Coordinates must be valid numbers.' } });
    }

    const restaurant = new Restaurant({
      name: name.trim(),
      description: description ? description.trim() : '',
      address: address ? address.trim() : '',
      area: area.trim(),
      location: {
        type: 'Point',
        coordinates: [longitude, latitude],
      },
      vibeTags: Array.isArray(vibeTags) ? vibeTags : [],
      photoUrl: photoUrl || '',
      busyStatus: busyStatus || 'Plenty of Tables',
      rating: rating ? Number(rating) : 0,
    });

    await restaurant.save();
    res.status(201).json(restaurant);
  } catch (error) {
    next(error);
  }
});

/**
 * @route   PUT /api/admin/restaurants/:id
 * @desc    Update restaurant details
 * @access  Admin Private
 */
router.put('/restaurants/:id', adminMiddleware, async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: { message: 'Invalid restaurant ID.' } });
    }

    const updateData = { ...req.body };
    if (updateData.coordinates && Array.isArray(updateData.coordinates)) {
      const [longitude, latitude] = updateData.coordinates.map(Number);
      if (!isNaN(longitude) && !isNaN(latitude)) {
        updateData.location = {
          type: 'Point',
          coordinates: [longitude, latitude],
        };
      }
      delete updateData.coordinates;
    }

    if (updateData.busyStatus) {
      updateData.busyStatusLastUpdated = new Date();
    }

    const restaurant = await Restaurant.findByIdAndUpdate(id, updateData, { new: true, runValidators: true });
    if (!restaurant) {
      return res.status(404).json({ error: { message: 'Restaurant not found.' } });
    }

    res.status(200).json(restaurant);
  } catch (error) {
    next(error);
  }
});

/**
 * @route   DELETE /api/admin/restaurants/:id
 * @desc    Delete restaurant and cascade delete all its dishes
 * @access  Admin Private
 */
router.delete('/restaurants/:id', adminMiddleware, async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: { message: 'Invalid restaurant ID.' } });
    }

    const restaurant = await Restaurant.findByIdAndDelete(id);
    if (!restaurant) {
      return res.status(404).json({ error: { message: 'Restaurant not found.' } });
    }

    await Dish.deleteMany({ restaurantId: id });
    await Review.deleteMany({ restaurantId: id });

    res.status(200).json({ message: 'Restaurant, dishes, and reviews deleted successfully.' });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/admin/restaurants/:restaurantId/dishes
 * @desc    Get all dishes for a specific restaurant
 * @access  Admin Private
 */
router.get('/restaurants/:restaurantId/dishes', adminMiddleware, async (req, res, next) => {
  try {
    const { restaurantId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(restaurantId)) {
      return res.status(400).json({ error: { message: 'Invalid restaurant ID.' } });
    }

    const dishes = await Dish.find({ restaurantId }).sort({ isSignature: -1, rating: -1 });
    res.status(200).json(dishes);
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/admin/dishes
 * @desc    Get all dishes across all restaurants with populated restaurant details
 * @access  Admin Private
 */
router.get('/dishes', adminMiddleware, async (req, res, next) => {
  try {
    const dishes = await Dish.find().populate('restaurantId').sort({ isSignature: -1, createdAt: -1 });
    res.status(200).json(dishes);
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/admin/dishes
 * @desc    Create a new dish (or signature dish) for a restaurant
 * @access  Admin Private
 */
router.post('/dishes', adminMiddleware, async (req, res, next) => {
  try {
    const { name, description, price, photoUrl, restaurantId, isSignature, rating } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: { message: 'Dish name is required.' } });
    }

    if (price === undefined || price === null || isNaN(Number(price)) || Number(price) < 0) {
      return res.status(400).json({ error: { message: 'A valid non-negative price is required.' } });
    }

    if (!restaurantId || !mongoose.Types.ObjectId.isValid(restaurantId)) {
      return res.status(400).json({ error: { message: 'A valid restaurant ID is required.' } });
    }

    const restaurant = await Restaurant.findById(restaurantId);
    if (!restaurant) {
      return res.status(404).json({ error: { message: 'Associated restaurant not found.' } });
    }

    const dish = new Dish({
      name: name.trim(),
      description: description ? description.trim() : '',
      price: Number(price),
      photoUrl: photoUrl || '',
      restaurantId,
      isSignature: isSignature !== undefined ? !!isSignature : true, // default true for admin additions
      rating: rating ? Number(rating) : 0,
    });

    await dish.save();
    const populated = await Dish.findById(dish._id).populate('restaurantId');
    res.status(201).json(populated);
  } catch (error) {
    next(error);
  }
});

/**
 * @route   PUT /api/admin/dishes/:id
 * @desc    Update a dish
 * @access  Admin Private
 */
router.put('/dishes/:id', adminMiddleware, async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: { message: 'Invalid dish ID.' } });
    }

    const { name, description, price, photoUrl, isSignature, rating, restaurantId } = req.body;
    const updateData = {};

    if (name !== undefined) updateData.name = name.trim();
    if (description !== undefined) updateData.description = description.trim();
    if (price !== undefined) {
      if (isNaN(Number(price)) || Number(price) < 0) {
        return res.status(400).json({ error: { message: 'Price must be a non-negative number.' } });
      }
      updateData.price = Number(price);
    }
    if (photoUrl !== undefined) updateData.photoUrl = photoUrl;
    if (isSignature !== undefined) updateData.isSignature = !!isSignature;
    if (rating !== undefined) updateData.rating = Number(rating);
    if (restaurantId && mongoose.Types.ObjectId.isValid(restaurantId)) updateData.restaurantId = restaurantId;

    const dish = await Dish.findByIdAndUpdate(id, updateData, { new: true, runValidators: true }).populate('restaurantId');
    if (!dish) {
      return res.status(404).json({ error: { message: 'Dish not found.' } });
    }

    res.status(200).json(dish);
  } catch (error) {
    next(error);
  }
});

/**
 * @route   PATCH /api/admin/dishes/:id/toggle-signature
 * @desc    Toggle signature status of a dish
 * @access  Admin Private
 */
router.patch('/dishes/:id/toggle-signature', adminMiddleware, async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: { message: 'Invalid dish ID.' } });
    }

    const dish = await Dish.findById(id);
    if (!dish) {
      return res.status(404).json({ error: { message: 'Dish not found.' } });
    }

    dish.isSignature = !dish.isSignature;
    await dish.save();

    res.status(200).json(dish);
  } catch (error) {
    next(error);
  }
});

/**
 * @route   DELETE /api/admin/dishes/:id
 * @desc    Delete a dish
 * @access  Admin Private
 */
router.delete('/dishes/:id', adminMiddleware, async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: { message: 'Invalid dish ID.' } });
    }

    const dish = await Dish.findByIdAndDelete(id);
    if (!dish) {
      return res.status(404).json({ error: { message: 'Dish not found.' } });
    }

    res.status(200).json({ message: 'Dish deleted successfully.' });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/admin/users
 * @desc    Get registered users enriched with profile fields (paginated)
 * @access  Admin Private
 */
router.get('/users', adminMiddleware, async (req, res, next) => {
  try {
    const { page, limit, skip, paginate } = parsePagination(req.query);
    const [users, total] = await Promise.all([
      User.find().select('-mpin').sort({ createdAt: -1 }).skip(skip).limit(limit),
      User.countDocuments(),
    ]);

    const userIds = users.map((u) => u._id);
    const profiles = await UserProfile.find({ userId: { $in: userIds } });
    const profileByUser = new Map(profiles.map((p) => [String(p.userId), p]));

    const enriched = users.map((u) => {
      const profile = profileByUser.get(String(u._id));
      return {
        ...u.toObject(),
        profile: {
          city: profile?.city || '',
          favoriteCuisine: profile?.favoriteCuisine || '',
          walksCompletedCount: profile?.walksCompletedCount || 0,
        },
      };
    });

    sendListResponse(res, enriched, { page, limit, total, paginate });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/admin/trails
 * @access  Admin Private
 */
router.get('/trails', adminMiddleware, async (req, res, next) => {
  try {
    const { page, limit, skip, paginate } = parsePagination(req.query);
    const [trails, total] = await Promise.all([
      Trail.find().sort({ createdAt: -1 }).skip(skip).limit(limit),
      Trail.countDocuments(),
    ]);
    sendListResponse(res, trails, { page, limit, total, paginate });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   PUT /api/admin/trails/:id
 * @access  Admin Private
 */
router.put('/trails/:id', adminMiddleware, async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: { message: 'Invalid trail ID.' } });
    }
    const { name, description, estimatedDuration, distance, area, photoUrl, stops } = req.body;
    const update = {};
    if (name !== undefined) update.name = String(name).trim();
    if (description !== undefined) update.description = description;
    if (estimatedDuration !== undefined) update.estimatedDuration = Number(estimatedDuration);
    if (distance !== undefined) update.distance = Number(distance);
    if (area !== undefined) update.area = String(area).trim();
    if (photoUrl !== undefined) update.photoUrl = photoUrl;
    if (Array.isArray(stops)) update.stops = stops;

    const trail = await Trail.findByIdAndUpdate(id, update, { new: true, runValidators: true });
    if (!trail) {
      return res.status(404).json({ error: { message: 'Trail not found.' } });
    }
    res.status(200).json(trail);
  } catch (error) {
    next(error);
  }
});

/**
 * @route   DELETE /api/admin/trails/:id
 * @access  Admin Private
 */
router.delete('/trails/:id', adminMiddleware, async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: { message: 'Invalid trail ID.' } });
    }
    const trail = await Trail.findByIdAndDelete(id);
    if (!trail) {
      return res.status(404).json({ error: { message: 'Trail not found.' } });
    }
    res.status(200).json({ message: 'Trail deleted successfully.' });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/admin/reviews
 * @access  Admin Private
 */
router.get('/reviews', adminMiddleware, async (req, res, next) => {
  try {
    const { page, limit, skip, paginate } = parsePagination(req.query);
    const [reviews, total] = await Promise.all([
      Review.find()
        .populate('user', 'name')
        .populate('restaurantId', 'name')
        .populate('dishId', 'name')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Review.countDocuments(),
    ]);
    sendListResponse(res, reviews, { page, limit, total, paginate });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   DELETE /api/admin/reviews/:id
 * @access  Admin Private
 */
router.delete('/reviews/:id', adminMiddleware, async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: { message: 'Invalid review ID.' } });
    }
    const review = await Review.findById(id);
    if (!review) {
      return res.status(404).json({ error: { message: 'Review not found.' } });
    }
    const { restaurantId, dishId } = review;
    await Review.findByIdAndDelete(id);
    if (restaurantId) await recalculateRating('restaurant', restaurantId);
    if (dishId) await recalculateRating('dish', dishId);
    res.status(200).json({ message: 'Review deleted successfully.' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
