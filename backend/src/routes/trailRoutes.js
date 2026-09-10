// File: src/routes/trailRoutes.js
// Description: Express routes for retrieving walking trails and their detailed stops.
// Author: Akilan M
// Created: 2026-08-11T17:38:21+05:30

const express = require('express');
const router = express.Router();
const Trail = require('../models/Trail');

/**
 * @route   GET /api/trails
 * @desc    Get all walking food trails
 * @access  Public
 */
router.get('/', async (req, res, next) => {
  try {
    const trails = await Trail.find({});
    res.json(trails);
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/trails/:id
 * @desc    Get a single walking trail with fully populated restaurant info for each stop
 * @access  Public
 */
router.get('/:id', async (req, res, next) => {
  try {
    const trail = await Trail.findById(req.params.id)
      .populate({
        path: 'stops.restaurantId',
        model: 'Restaurant',
      });

    if (!trail) {
      return res.status(404).json({ error: { message: 'Trail not found' } });
    }

    res.json(trail);
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/trails
 * @desc    Create a new walking food trail
 * @access  Public
 */
router.post('/', async (req, res, next) => {
  try {
    const { name, description, estimatedDuration, distance, area, photoUrl, stops } = req.body;

    // Validate required fields
    if (!name || !estimatedDuration || !distance || !area || typeof area !== 'string' || !area.trim()) {
      return res.status(400).json({
        error: { message: 'Fields name, estimatedDuration, distance, and area are required.' },
      });
    }

    // Validate stops structure if provided
    if (stops && Array.isArray(stops)) {
      for (const stop of stops) {
        if (stop.order === undefined || !stop.restaurantId) {
          return res.status(400).json({
            error: { message: 'Each stop must have an order and a restaurantId.' },
          });
        }
      }
    }

    const trail = new Trail({
      name,
      description,
      estimatedDuration,
      distance,
      area,
      photoUrl,
      stops: stops || [],
    });

    await trail.save();

    res.status(201).json(trail);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
