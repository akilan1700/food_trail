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

module.exports = router;
