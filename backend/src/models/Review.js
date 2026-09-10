// File: src/models/Review.js
// Description: Review and comment Mongoose schema for user-written dining spot and dish reviews with star ratings.
// Author: Akilan M
// Created: 2026-09-10T12:59:02+05:30

const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User reference is required'],
      index: true,
    },
    restaurantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Restaurant',
      default: null,
      index: true,
    },
    dishId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Dish',
      default: null,
      index: true,
    },
    rating: {
      type: Number,
      required: [true, 'Rating is required'],
      min: [1, 'Rating must be at least 1 star'],
      max: [5, 'Rating cannot exceed 5 stars'],
    },
    comment: {
      type: String,
      required: [true, 'Review comment text is required'],
      trim: true,
      maxlength: [1000, 'Comment cannot exceed 1000 characters'],
    },
  },
  {
    timestamps: true,
  }
);

// Compound index to optimize querying reviews for specific targets ordered by date
reviewSchema.index({ restaurantId: 1, createdAt: -1 });
reviewSchema.index({ dishId: 1, createdAt: -1 });

module.exports = mongoose.model('Review', reviewSchema);
