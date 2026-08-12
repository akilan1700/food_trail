// File: src/routes/dishRoutes.js
// Description: Express routes for dish searching and filtering by restaurant vibes.
// Author: Akilan M
// Created: 2026-08-11T17:38:11+05:30

const express = require('express');
const router = express.Router();
const Dish = require('../models/Dish');
const Restaurant = require('../models/Restaurant');

/**
 * @route   GET /api/dishes/search
 * @desc    Search for dishes and filter by restaurant vibes, returning top 3 matches
 * @access  Public
 */
router.get('/search', async (req, res, next) => {
  try {
    const { q, vibe } = req.query;

    let query = {};
    if (q) {
      // Case-insensitive regex match on dish name or description
      query.$or = [
        { name: { $regex: q, $options: 'i' } },
        { description: { $regex: q, $options: 'i' } },
      ];
    }

    // Fetch matched dishes and populate their restaurant details
    let dishes = await Dish.find(query).populate('restaurantId');

    // Filter by restaurant vibe tags if provided
    if (vibe) {
      const vibeFilters = vibe.split(',').map(v => v.trim().toLowerCase());
      dishes = dishes.filter((dish) => {
        if (!dish.restaurantId) return false;
        const restVibes = dish.restaurantId.vibeTags.map(v => v.toLowerCase());
        // Verify that every filtered vibe is present in the restaurant's vibe tags
        return vibeFilters.every(f => restVibes.includes(f));
      });
    }

    // Sort dishes by rating in descending order to get the "best spots"
    dishes.sort((a, b) => b.rating - a.rating);

    // Limit to the top 3 matches
    const top3Dishes = dishes.slice(0, 3);

    res.json(top3Dishes);
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/dishes
 * @desc    Get all dishes
 * @access  Public
 */
router.get('/', async (req, res, next) => {
  try {
    const dishes = await Dish.find({}).populate('restaurantId');
    res.json(dishes);
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/dishes
 * @desc    Create a new dish
 * @access  Public
 */
router.post('/', async (req, res, next) => {
  try {
    const { name, description, price, photoUrl, restaurantId, isSignature } = req.body;

    // Validation
    if (!name || !name.trim()) {
      return res.status(400).json({ error: { message: 'Dish name is required' } });
    }

    if (price === undefined || price === null || isNaN(Number(price)) || Number(price) < 0) {
      return res.status(400).json({ error: { message: 'A valid non-negative price is required' } });
    }

    if (!restaurantId) {
      return res.status(400).json({ error: { message: 'Restaurant ID is required' } });
    }

    // Verify restaurant exists
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
