// File: src/routes/tripRoutes.js
// Description: Express routes for creating and retrieving shared user trips.
// Author: Akilan M
// Created: 2026-08-11T17:38:25+05:30

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const SavedTrip = require('../models/SavedTrip');

/**
 * @route   POST /api/trips
 * @desc    Save a list of restaurant IDs and optional trail ID to generate a shareable link
 * @access  Public
 */
router.post('/', async (req, res, next) => {
  try {
    const { restaurantIds, trailId } = req.body;

    // Validation
    if (!restaurantIds || !Array.isArray(restaurantIds) || restaurantIds.length === 0) {
      return res.status(400).json({
        error: { message: 'restaurantIds must be a non-empty array of IDs' },
      });
    }

    // Validate each restaurant ID format
    for (const id of restaurantIds) {
      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({
          error: { message: `Invalid restaurant ID format: ${id}` },
        });
      }
    }

    // Validate trail ID format if provided
    if (trailId && !mongoose.Types.ObjectId.isValid(trailId)) {
      return res.status(400).json({
        error: { message: `Invalid trail ID format: ${trailId}` },
      });
    }

    // Create saved trip
    const newTrip = new SavedTrip({
      restaurantIds,
      trailId: trailId || undefined,
    });

    await newTrip.save();

    res.status(201).json({
      message: 'Trip saved successfully',
      shareId: newTrip.shareId,
      url: `/trip/shared/${newTrip.shareId}`,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/trips/:shareId
 * @desc    Get a saved trip configuration using its short shareId
 * @access  Public
 */
router.get('/:shareId', async (req, res, next) => {
  try {
    const { shareId } = req.params;

    // Sanitize check (shareId should be alphanumeric hex string of length 8)
    if (!/^[a-f0-9]{8}$/i.test(shareId)) {
      return res.status(400).json({
        error: { message: 'Invalid share ID format' },
      });
    }

    const trip = await SavedTrip.findOne({ shareId })
      .populate('restaurantIds')
      .populate('trailId');

    if (!trip) {
      return res.status(404).json({
        error: { message: 'Saved trip not found' },
      });
    }

    res.json(trip);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
