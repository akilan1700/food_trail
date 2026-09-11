// File: src/routes/dishRoutes.js
// Description: Express routes for dish searching, listing, and authenticated create.
// Author: Akilan M
// Updated: 2026-09-11

const express = require('express');
const router = express.Router();
const Dish = require('../models/Dish');
const Restaurant = require('../models/Restaurant');
const authMiddleware = require('../middleware/authMiddleware');
const { escapeRegex } = require('../utils/escapeRegex');
const { parsePagination, sendListResponse } = require('../utils/pagination');

/**
 * @route   GET /api/dishes/search
 * @desc    Search for dishes and filter by restaurant vibes
 * @access  Public
 */
router.get('/search', async (req, res, next) => {
  try {
    const { q, vibe } = req.query;
    const { page, limit, skip, paginate } = parsePagination(req.query);

    let query = {};
    let dishes;

    if (q) {
      const safe = escapeRegex(q);
      const matchingRestaurants = await Restaurant.find({
        $or: [
          { name: { $regex: safe, $options: 'i' } },
          { area: { $regex: safe, $options: 'i' } },
        ],
      }).select('_id');
      const matchedRestIds = matchingRestaurants.map((r) => r._id);

      try {
        dishes = await Dish.find(
          { $text: { $search: q } },
          { score: { $meta: 'textScore' } }
        )
          .sort({ score: { $meta: 'textScore' } })
          .populate('restaurantId');
      } catch {
        dishes = null;
      }

      if (!dishes || dishes.length === 0) {
        query.$or = [
          { name: { $regex: safe, $options: 'i' } },
          { description: { $regex: safe, $options: 'i' } },
          { restaurantId: { $in: matchedRestIds } },
        ];
        dishes = await Dish.find(query).populate('restaurantId');
      }
    } else {
      dishes = await Dish.find({}).populate('restaurantId');
    }

    if (vibe) {
      const vibeFilters = vibe.split(',').map((v) => v.trim().toLowerCase()).filter(Boolean);
      dishes = dishes.filter((dish) => {
        if (!dish.restaurantId) return false;
        const restVibes = (dish.restaurantId.vibeTags || []).map((v) => v.toLowerCase());
        return vibeFilters.every((f) => restVibes.includes(f));
      });
    }

    dishes.sort((a, b) => b.rating - a.rating);
    const total = dishes.length;
    const pageRows = dishes.slice(skip, skip + limit);
    sendListResponse(res, pageRows, { page, limit, total, paginate });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/dishes
 * @desc    Get all dishes (paginated when page/limit provided)
 * @access  Public
 */
router.get('/', async (req, res, next) => {
  try {
    const { page, limit, skip, paginate } = parsePagination(req.query);
    const [dishes, total] = await Promise.all([
      Dish.find({}).populate('restaurantId').skip(skip).limit(limit),
      Dish.countDocuments({}),
    ]);
    sendListResponse(res, dishes, { page, limit, total, paginate });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/dishes
 * @desc    Create a new dish (authenticated)
 * @access  Private
 */
router.post('/', authMiddleware, async (req, res, next) => {
  try {
    const { name, description, price, photoUrl, restaurantId, isSignature } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: { message: 'Dish name is required' } });
    }

    if (price === undefined || price === null || isNaN(Number(price)) || Number(price) < 0) {
      return res.status(400).json({ error: { message: 'A valid non-negative price is required' } });
    }

    if (!restaurantId) {
      return res.status(400).json({ error: { message: 'Restaurant ID is required' } });
    }

    const restaurant = await Restaurant.findById(restaurantId);
    if (!restaurant) {
      return res.status(404).json({ error: { message: 'Associated restaurant not found' } });
    }

    const dish = new Dish({
      name,
      description,
      price: Number(price),
      photoUrl,
      restaurantId,
      isSignature: !!isSignature,
    });

    await dish.save();
    res.status(201).json(dish);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
