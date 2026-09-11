// File: src/routes/reviewRoutes.js
// Description: Express routes for creating, fetching, and deleting user ratings, reviews, and comments.
// Author: Akilan M
// Created: 2026-09-10T12:59:02+05:30

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Review = require('../models/Review');
const Restaurant = require('../models/Restaurant');
const Dish = require('../models/Dish');
const authMiddleware = require('../middleware/authMiddleware');
const { recalculateRating } = require('../services/reviewService');

/**
 * @route   GET /api/reviews
 * @desc    Get all reviews for a specific restaurant or dish
 * @access  Public
 */
router.get('/', async (req, res, next) => {
  try {
    const { restaurantId, dishId } = req.query;

    if (!restaurantId && !dishId) {
      return res.status(400).json({
        error: { message: 'Either restaurantId or dishId query parameter is required' },
      });
    }

    const filter = {};
    if (restaurantId) {
      if (!mongoose.Types.ObjectId.isValid(restaurantId)) {
        return res.status(400).json({ error: { message: 'Invalid restaurantId format' } });
      }
      filter.restaurantId = restaurantId;
    }

    if (dishId) {
      if (!mongoose.Types.ObjectId.isValid(dishId)) {
        return res.status(400).json({ error: { message: 'Invalid dishId format' } });
      }
      filter.dishId = dishId;
    }

    const reviews = await Review.find(filter)
      .populate('user', 'name')
      .sort({ createdAt: -1 });

    res.json(reviews);
  } catch (error) {
    next(error);
  }
});

/**
 * @route   POST /api/reviews
 * @desc    Submit a user rating and review comment for a dining spot or dish
 * @access  Private (Authenticated User)
 */
router.post('/', authMiddleware, async (req, res, next) => {
  try {
    const { restaurantId, dishId, rating, comment } = req.body;

    // Validate target
    if (!restaurantId && !dishId) {
      return res.status(400).json({
        error: { message: 'Either restaurantId or dishId must be provided' },
      });
    }

    if (restaurantId && !mongoose.Types.ObjectId.isValid(restaurantId)) {
      return res.status(400).json({ error: { message: 'Invalid restaurantId' } });
    }

    if (dishId && !mongoose.Types.ObjectId.isValid(dishId)) {
      return res.status(400).json({ error: { message: 'Invalid dishId' } });
    }

    // Validate rating
    const parsedRating = Number(rating);
    if (isNaN(parsedRating) || parsedRating < 1 || parsedRating > 5) {
      return res.status(400).json({
        error: { message: 'Rating must be a number between 1 and 5' },
      });
    }

    // Validate comment
    if (!comment || typeof comment !== 'string' || !comment.trim()) {
      return res.status(400).json({
        error: { message: 'Review comment cannot be empty' },
      });
    }

    const sanitizedComment = comment.trim();
    if (sanitizedComment.length > 1000) {
      return res.status(400).json({
        error: { message: 'Review comment cannot exceed 1000 characters' },
      });
    }

    // Verify entity existence
    if (restaurantId) {
      const restaurantExists = await Restaurant.exists({ _id: restaurantId });
      if (!restaurantExists) {
        return res.status(404).json({ error: { message: 'Restaurant not found' } });
      }
    }

    if (dishId) {
      const dishExists = await Dish.exists({ _id: dishId });
      if (!dishExists) {
        return res.status(404).json({ error: { message: 'Dish not found' } });
      }
    }

    // Create review
    const review = new Review({
      user: req.user._id,
      restaurantId: restaurantId || null,
      dishId: dishId || null,
      rating: parsedRating,
      comment: sanitizedComment,
    });

    await review.save();

    // Dynamically recalculate target entity rating
    if (restaurantId) {
      await recalculateRating('restaurant', restaurantId);
    }
    if (dishId) {
      await recalculateRating('dish', dishId);
    }

    const populatedReview = await Review.findById(review._id).populate('user', 'name');

    res.status(201).json(populatedReview);
  } catch (error) {
    next(error);
  }
});

/**
 * @route   DELETE /api/reviews/:id
 * @desc    Delete a review (must be owner)
 * @access  Private (Authenticated User)
 */
router.delete('/:id', authMiddleware, async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: { message: 'Invalid review ID' } });
    }

    const review = await Review.findById(id);
    if (!review) {
      return res.status(404).json({ error: { message: 'Review not found' } });
    }

    // Only review owner or admin can delete
    if (review.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        error: { message: 'Not authorized to delete this review' },
      });
    }

    const { restaurantId, dishId } = review;
    await Review.findByIdAndDelete(id);

    // Recalculate target ratings
    if (restaurantId) {
      await recalculateRating('restaurant', restaurantId);
    }
    if (dishId) {
      await recalculateRating('dish', dishId);
    }

    res.json({ success: true, message: 'Review deleted successfully' });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
