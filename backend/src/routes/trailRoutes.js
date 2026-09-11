// File: src/routes/trailRoutes.js
// Description: Express routes for walking trails list/detail and authenticated create.
// Author: Akilan M
// Updated: 2026-09-11

const express = require('express');
const router = express.Router();
const Trail = require('../models/Trail');
const authMiddleware = require('../middleware/authMiddleware');
const { parsePagination, sendListResponse } = require('../utils/pagination');

/**
 * @route   GET /api/trails
 * @desc    Get all walking food trails (paginated when page/limit provided)
 * @access  Public
 */
router.get('/', async (req, res, next) => {
  try {
    const { page, limit, skip, paginate } = parsePagination(req.query);
    const [trails, total] = await Promise.all([
      Trail.find({}).skip(skip).limit(limit),
      Trail.countDocuments({}),
    ]);
    sendListResponse(res, trails, { page, limit, total, paginate });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/trails/:id
 * @desc    Get a single walking trail with populated stops
 * @access  Public
 */
router.get('/:id', async (req, res, next) => {
  try {
    const trail = await Trail.findById(req.params.id).populate({
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
 * @desc    Create a new walking food trail (authenticated)
 * @access  Private
 */
router.post('/', authMiddleware, async (req, res, next) => {
  try {
    const { name, description, estimatedDuration, distance, area, photoUrl, stops } = req.body;

    if (!name || !estimatedDuration || !distance || !area || typeof area !== 'string' || !area.trim()) {
      return res.status(400).json({
        error: { message: 'Fields name, estimatedDuration, distance, and area are required.' },
      });
    }

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
      createdBy: req.user._id,
    });

    await trail.save();
    res.status(201).json(trail);
  } catch (error) {
    next(error);
  }
});

/**
 * @route   DELETE /api/trails/:id
 * @desc    Delete a walking trail (creator, or any authenticated user if creator unknown)
 * @access  Private
 */
router.delete('/:id', authMiddleware, async (req, res, next) => {
  try {
    const trail = await Trail.findById(req.params.id);
    if (!trail) {
      return res.status(404).json({ error: { message: 'Trail not found' } });
    }

    const ownerId = trail.createdBy ? String(trail.createdBy) : null;
    const requesterId = String(req.user._id);
    if (ownerId && ownerId !== requesterId) {
      return res.status(403).json({
        error: { message: 'Only the trail creator can delete this walking trail' },
      });
    }

    await trail.deleteOne();
    res.json({ success: true, message: 'Trail deleted successfully' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
