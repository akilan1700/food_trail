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

/**
 * @route   PATCH /api/restaurants/:id/photo
 * @desc    Update a restaurant's photo URL (Google Drive File ID)
 * @access  Public
 */
router.patch('/:id/photo', async (req, res, next) => {
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
 * @desc    Create a new restaurant
 * @access  Public
 */
router.post('/', async (req, res, next) => {
  try {
    const { name, description, address, area, coordinates, vibeTags, photoUrl } = req.body;

    // Validation
    if (!name || !name.trim()) {
      return res.status(400).json({ error: { message: 'Restaurant name is required' } });
    }

    const validAreas = ['White Town', 'Auroville Road', 'Heritage Town', 'Others'];
    if (!area || !validAreas.includes(area)) {
      return res.status(400).json({
        error: { message: `Area is required and must be one of: ${validAreas.join(', ')}` },
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

    let createdBy = null;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const jwt = require('jsonwebtoken');
        const token = authHeader.split(' ')[1];
        const JWT_SECRET = process.env.JWT_SECRET || 'foodtrail-super-secret-key-change-in-prod';
        const decoded = jwt.verify(token, JWT_SECRET);
        createdBy = decoded.userId;
      } catch (err) {
        // Ignore invalid token for public route
      }
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
      createdBy,
    });

    await restaurant.save();

    res.status(201).json(restaurant);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
