// File: src/routes/restaurantRoutes.js
// Description: Express routes for retrieving restaurants and updating their live busy status.
// Author: Akilan M
// Created: 2026-08-11T17:38:17+05:30

const express = require('express');
const router = express.Router();
const Restaurant = require('../models/Restaurant');
const Dish = require('../models/Dish');

/**
 * @route   GET /api/restaurants
 * @desc    Get all restaurants, with optional area filtering
 * @access  Public
 */
router.get('/', async (req, res, next) => {
  try {
    const { area } = req.query;
    let query = {};
    if (area) {
      query.area = area;
    }
    const restaurants = await Restaurant.find(query);
    res.json(restaurants);
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/restaurants/:id
 * @desc    Get a single restaurant and its associated menu dishes
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
 * @route   PATCH /api/restaurants/:id/busy-status
 * @desc    Update a restaurant's live busy status with validation
 * @access  Public
 */
router.patch('/:id/busy-status', async (req, res, next) => {
  try {
    const { busyStatus } = req.body;
    const validStatuses = ['Plenty of Tables', 'Filling Up', '~15 Min Wait', 'Closed'];

    if (!busyStatus || !validStatuses.includes(busyStatus)) {
      return res.status(400).json({
        error: { message: `Invalid busyStatus. Must be one of: ${validStatuses.join(', ')}` },
      });
    }

    const restaurant = await Restaurant.findByIdAndUpdate(
      req.params.id,
      {
        busyStatus,
        busyStatusLastUpdated: new Date(),
      },
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

module.exports = router;
