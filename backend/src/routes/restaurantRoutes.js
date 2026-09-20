// File: src/routes/restaurantRoutes.js
// Description: Express routes for retrieving restaurants and authenticated create/update/delete.
// Author: Akilan M
// Updated: 2026-09-11

const express = require('express');
const router = express.Router();
const Restaurant = require('../models/Restaurant');
const Dish = require('../models/Dish');
const Review = require('../models/Review');
const authMiddleware = require('../middleware/authMiddleware');
const authOrAdminMiddleware = require('../middleware/authOrAdminMiddleware');
const { escapeRegex } = require('../utils/escapeRegex');
const { parsePagination, sendListResponse } = require('../utils/pagination');

/**
 * Returns true if the requester is admin or the restaurant owner.
 * @param {import('express').Request} req
 * @param {object} restaurant
 * @returns {boolean}
 */
function canMutateRestaurant(req, restaurant) {
  if (req.admin) return true;
  if (req.user && restaurant.createdBy && String(restaurant.createdBy) === String(req.user._id)) {
    return true;
  }
  return false;
}

/**
 * @route   GET /api/restaurants
 * @desc    Get restaurants with optional search/vibe/area filters (paginated)
 * @access  Public
 */
router.get('/', async (req, res, next) => {
  try {
    const { area, q, vibe } = req.query;
    const { page, limit, skip, paginate } = parsePagination(req.query);
    const query = {};
    if (area) {
      query.area = { $regex: new RegExp(`^${escapeRegex(area)}$`, 'i') };
    }
    if (q) {
      const safe = escapeRegex(q);
      query.$or = [
        { name: { $regex: safe, $options: 'i' } },
        { description: { $regex: safe, $options: 'i' } },
        { area: { $regex: safe, $options: 'i' } },
      ];
    }
    if (vibe) {
      const vibes = vibe.split(',').map((v) => v.trim()).filter(Boolean);
      if (vibes.length) query.vibeTags = { $all: vibes };
    }
    const [restaurants, total] = await Promise.all([
      Restaurant.find(query).sort({ rating: -1, _id: -1 }).skip(skip).limit(limit),
      Restaurant.countDocuments(query),
    ]);
    sendListResponse(res, restaurants, { page, limit, total, paginate });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/restaurants/my-spots
 * @desc    Get restaurants created by the authenticated user
 * @access  Private
 */
router.get('/my-spots', authMiddleware, async (req, res, next) => {
  try {
    const restaurants = await Restaurant.find({ createdBy: req.user._id }).sort({ createdAt: -1 });
    res.json(restaurants);
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/restaurants/:id
 * @desc    Get a single restaurant and its menu dishes
 * @access  Public
 */
router.get('/:id', async (req, res, next) => {
  try {
    const restaurant = await Restaurant.findById(req.params.id);
    if (!restaurant) {
      return res.status(404).json({ error: { message: 'Restaurant not found' } });
    }
    const dishes = await Dish.find({ restaurantId: restaurant._id });
    res.json({ restaurant, dishes });
  } catch (error) {
    next(error);
  }
});


/**
 * @route   PATCH /api/restaurants/:id/photo
 * @desc    Update restaurant photo URL (any authenticated user or admin)
 * @access  Private
 */
router.patch('/:id/photo', authOrAdminMiddleware, async (req, res, next) => {
  try {
    const { photoUrl } = req.body;
    if (!photoUrl) {
      return res.status(400).json({ error: { message: 'photoUrl is required' } });
    }

    const restaurant = await Restaurant.findByIdAndUpdate(
      req.params.id,
      { photoUrl },
      { new: true }
    );

    if (!restaurant) {
      return res.status(404).json({ error: { message: 'Restaurant not found' } });
    }

    res.json(restaurant);
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/restaurants
 * @desc    Create a new restaurant (authenticated)
 * @access  Private
 */
router.post('/', authMiddleware, async (req, res, next) => {
  try {
    const { name, description, address, area, coordinates, vibeTags, photoUrl } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: { message: 'Restaurant name is required' } });
    }

    if (!area || typeof area !== 'string' || !area.trim()) {
      return res.status(400).json({
        error: { message: 'Area is required' },
      });
    }

    if (!coordinates || !Array.isArray(coordinates) || coordinates.length !== 2) {
      return res.status(400).json({
        error: { message: 'Coordinates are required as an array of [longitude, latitude]' },
      });
    }

    const [longitude, latitude] = coordinates.map(Number);
    if (isNaN(longitude) || isNaN(latitude)) {
      return res.status(400).json({
        error: { message: 'Coordinates must be valid numbers' },
      });
    }

    const restaurant = new Restaurant({
      name,
      description,
      address,
      area,
      location: {
        type: 'Point',
        coordinates: [longitude, latitude],
      },
      vibeTags: Array.isArray(vibeTags) ? vibeTags : [],
      photoUrl,
      createdBy: req.user._id,
    });

    await restaurant.save();
    res.status(201).json(restaurant);
  } catch (error) {
    next(error);
  }
});

/**
 * @route   PUT /api/restaurants/:id
 * @desc    Update own restaurant (owner or admin)
 * @access  Private
 */
router.put('/:id', authOrAdminMiddleware, async (req, res, next) => {
  try {
    const restaurant = await Restaurant.findById(req.params.id);
    if (!restaurant) {
      return res.status(404).json({ error: { message: 'Restaurant not found' } });
    }
    if (!canMutateRestaurant(req, restaurant)) {
      return res.status(403).json({ error: { message: 'Not allowed to update this restaurant' } });
    }

    const { name, description, address, area, coordinates, vibeTags, photoUrl } = req.body;
    if (name !== undefined) restaurant.name = String(name).trim();
    if (description !== undefined) restaurant.description = description;
    if (address !== undefined) restaurant.address = address;
    if (area !== undefined) restaurant.area = String(area).trim();
    if (photoUrl !== undefined) restaurant.photoUrl = photoUrl;
    if (Array.isArray(vibeTags)) restaurant.vibeTags = vibeTags;
    if (coordinates && Array.isArray(coordinates) && coordinates.length === 2) {
      const [longitude, latitude] = coordinates.map(Number);
      if (!isNaN(longitude) && !isNaN(latitude)) {
        restaurant.location = { type: 'Point', coordinates: [longitude, latitude] };
      }
    }

    await restaurant.save();
    res.json(restaurant);
  } catch (error) {
    next(error);
  }
});

/**
 * @route   DELETE /api/restaurants/:id
 * @desc    Delete own restaurant and related dishes/reviews
 * @access  Private
 */
router.delete('/:id', authOrAdminMiddleware, async (req, res, next) => {
  try {
    const restaurant = await Restaurant.findById(req.params.id);
    if (!restaurant) {
      return res.status(404).json({ error: { message: 'Restaurant not found' } });
    }
    if (!canMutateRestaurant(req, restaurant)) {
      return res.status(403).json({ error: { message: 'Not allowed to delete this restaurant' } });
    }

    await Dish.deleteMany({ restaurantId: restaurant._id });
    await Review.deleteMany({ restaurantId: restaurant._id });
    await restaurant.deleteOne();

    res.json({ success: true, message: 'Restaurant deleted' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
