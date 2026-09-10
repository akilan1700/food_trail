// File: src/services/reviewService.js
// Description: Service module for aggregating user reviews and updating restaurant and dish ratings dynamically.
// Author: Akilan M
// Created: 2026-09-10T12:59:02+05:30

const mongoose = require('mongoose');
const Review = require('../models/Review');
const Restaurant = require('../models/Restaurant');
const Dish = require('../models/Dish');

/**
 * Recalculates and updates the aggregated rating and total review count for a restaurant or dish.
 * @param {'restaurant' | 'dish'} targetType - The type of target entity being rated.
 * @param {string | mongoose.Types.ObjectId} targetId - The target entity ID.
 * @returns {Promise<{ rating: number, reviewCount: number }>} - Updated rating statistics.
 */
async function recalculateRating(targetType, targetId) {
  try {
    const objectId = new mongoose.Types.ObjectId(targetId);
    const matchField = targetType === 'restaurant' ? 'restaurantId' : 'dishId';

    const stats = await Review.aggregate([
      { $match: { [matchField]: objectId } },
      {
        $group: {
          _id: null,
          avgRating: { $avg: '$rating' },
          totalReviews: { $sum: 1 },
        },
      },
    ]);

    const reviewCount = stats.length > 0 ? stats[0].totalReviews : 0;
    // Round average rating to 1 decimal place; fallback to 0 if no reviews exist
    const rawAvg = stats.length > 0 ? stats[0].avgRating : 0;
    const rating = Math.round(rawAvg * 10) / 10;

    if (targetType === 'restaurant') {
      await Restaurant.findByIdAndUpdate(objectId, {
        rating,
        reviewCount,
      });
    } else if (targetType === 'dish') {
      await Dish.findByIdAndUpdate(objectId, {
        rating,
        reviewCount,
      });
    }

    return { rating, reviewCount };
  } catch (error) {
    console.error(`Error recalculating rating for ${targetType} ${targetId}:`, error);
    throw error;
  }
}

module.exports = {
  recalculateRating,
};
