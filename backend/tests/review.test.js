// File: tests/review.test.js
// Description: Integration tests for user ratings, reviews, comments, and dynamic rating calculations.
// Author: Akilan M
// Created: 2026-09-10T12:59:02+05:30

const request = require('supertest');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const app = require('../src/app');
const User = require('../src/models/User');
const Restaurant = require('../src/models/Restaurant');
const Dish = require('../src/models/Dish');
const Review = require('../src/models/Review');

const TEST_MONGO_URI = 'mongodb://localhost:27017/foodtrail_test';
const JWT_SECRET = process.env.JWT_SECRET || 'foodtrail-super-secret-key-change-in-prod';

beforeAll(async () => {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(TEST_MONGO_URI);
  }
});

afterAll(async () => {
  await mongoose.connection.db.dropDatabase();
  await mongoose.connection.close();
});

describe('Review & Comment API Integration Tests', () => {
  let user1;
  let user2;
  let token1;
  let token2;
  let restaurant;
  let dish;

  beforeEach(async () => {
    await User.deleteMany({});
    await Restaurant.deleteMany({});
    await Dish.deleteMany({});
    await Review.deleteMany({});

    // Create users
    user1 = new User({ email: 'user1@example.com', name: 'John Doe', mpin: '123456' });
    await user1.save();
    token1 = jwt.sign({ userId: user1._id }, JWT_SECRET, { expiresIn: '7d' });

    user2 = new User({ email: 'user2@example.com', name: 'Jane Smith', mpin: '654321' });
    await user2.save();
    token2 = jwt.sign({ userId: user2._id }, JWT_SECRET, { expiresIn: '7d' });

    // Create restaurant
    restaurant = new Restaurant({
      name: 'Cafe Coromandel',
      description: 'French heritage cafe',
      address: '8 Romain Rolland St',
      area: 'White Town',
      location: {
        type: 'Point',
        coordinates: [79.83, 11.93],
      },
      vibeTags: ['Vintage vibe', 'Bakery'],
    });
    await restaurant.save();

    // Create dish
    dish = new Dish({
      name: 'Pistachio Croissant',
      description: 'Flaky pastry filled with pistachio cream',
      price: 220,
      restaurantId: restaurant._id,
      isSignature: true,
    });
    await dish.save();
  });

  describe('POST /api/reviews', () => {
    test('should allow authenticated user to submit a review with rating and comment for a restaurant', async () => {
      const res = await request(app)
        .post('/api/reviews')
        .set('Authorization', `Bearer ${token1}`)
        .send({
          restaurantId: restaurant._id.toString(),
          rating: 5,
          comment: 'Outstanding ambience and authentic pastries!',
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.rating).toBe(5);
      expect(res.body.comment).toBe('Outstanding ambience and authentic pastries!');
      expect(res.body.user.name).toBe('John Doe');

      // Check dynamic recalculation on Restaurant
      const updatedRest = await Restaurant.findById(restaurant._id);
      expect(updatedRest.rating).toBe(5);
      expect(updatedRest.reviewCount).toBe(1);
    });

    test('should dynamically compute average rating across multiple user reviews', async () => {
      // User 1 gives 5 stars
      await request(app)
        .post('/api/reviews')
        .set('Authorization', `Bearer ${token1}`)
        .send({
          restaurantId: restaurant._id.toString(),
          rating: 5,
          comment: 'Best in town!',
        });

      // User 2 gives 4 stars
      await request(app)
        .post('/api/reviews')
        .set('Authorization', `Bearer ${token2}`)
        .send({
          restaurantId: restaurant._id.toString(),
          rating: 4,
          comment: 'Good food but slightly crowded.',
        });

      const updatedRest = await Restaurant.findById(restaurant._id);
      expect(updatedRest.rating).toBe(4.5);
      expect(updatedRest.reviewCount).toBe(2);
    });

    test('should allow reviewing a dish and update dish average rating', async () => {
      const res = await request(app)
        .post('/api/reviews')
        .set('Authorization', `Bearer ${token1}`)
        .send({
          dishId: dish._id.toString(),
          rating: 4,
          comment: 'Crispy and rich pistachio filling!',
        });

      expect(res.statusCode).toBe(201);
      expect(res.body.dishId).toBe(dish._id.toString());

      const updatedDish = await Dish.findById(dish._id);
      expect(updatedDish.rating).toBe(4);
      expect(updatedDish.reviewCount).toBe(1);
    });

    test('should reject review without auth token', async () => {
      const res = await request(app)
        .post('/api/reviews')
        .send({
          restaurantId: restaurant._id.toString(),
          rating: 5,
          comment: 'Unauthorized review test',
        });

      expect(res.statusCode).toBe(401);
    });

    test('should reject invalid rating values (< 1 or > 5)', async () => {
      const resInvalidLow = await request(app)
        .post('/api/reviews')
        .set('Authorization', `Bearer ${token1}`)
        .send({
          restaurantId: restaurant._id.toString(),
          rating: 0,
          comment: 'Bad rating value',
        });

      expect(resInvalidLow.statusCode).toBe(400);

      const resInvalidHigh = await request(app)
        .post('/api/reviews')
        .set('Authorization', `Bearer ${token1}`)
        .send({
          restaurantId: restaurant._id.toString(),
          rating: 6,
          comment: 'Too high rating value',
        });

      expect(resInvalidHigh.statusCode).toBe(400);
    });

    test('should reject empty comment', async () => {
      const res = await request(app)
        .post('/api/reviews')
        .set('Authorization', `Bearer ${token1}`)
        .send({
          restaurantId: restaurant._id.toString(),
          rating: 5,
          comment: '   ',
        });

      expect(res.statusCode).toBe(400);
    });
  });

  describe('GET /api/reviews', () => {
    test('should list all reviews for a restaurant with populated user details in chronological order', async () => {
      await request(app)
        .post('/api/reviews')
        .set('Authorization', `Bearer ${token1}`)
        .send({
          restaurantId: restaurant._id.toString(),
          rating: 5,
          comment: 'First review',
        });

      await request(app)
        .post('/api/reviews')
        .set('Authorization', `Bearer ${token2}`)
        .send({
          restaurantId: restaurant._id.toString(),
          rating: 4,
          comment: 'Second review',
        });

      const res = await request(app).get(`/api/reviews?restaurantId=${restaurant._id}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.length).toBe(2);
      expect(res.body[0].comment).toBe('Second review');
      expect(res.body[0].user.name).toBe('Jane Smith');
      expect(res.body[1].comment).toBe('First review');
      expect(res.body[1].user.name).toBe('John Doe');
    });

    test('should return 400 if neither restaurantId nor dishId is supplied', async () => {
      const res = await request(app).get('/api/reviews');
      expect(res.statusCode).toBe(400);
    });
  });

  describe('DELETE /api/reviews/:id', () => {
    test('should allow owner to delete review and dynamically recalculate target rating', async () => {
      const createRes = await request(app)
        .post('/api/reviews')
        .set('Authorization', `Bearer ${token1}`)
        .send({
          restaurantId: restaurant._id.toString(),
          rating: 5,
          comment: 'Great place',
        });

      const reviewId = createRes.body._id;

      // Verify created
      let rest = await Restaurant.findById(restaurant._id);
      expect(rest.rating).toBe(5);
      expect(rest.reviewCount).toBe(1);

      // User 1 deletes their review
      const deleteRes = await request(app)
        .delete(`/api/reviews/${reviewId}`)
        .set('Authorization', `Bearer ${token1}`);

      expect(deleteRes.statusCode).toBe(200);
      expect(deleteRes.body.success).toBe(true);

      // Verify recalculation back to 0
      rest = await Restaurant.findById(restaurant._id);
      expect(rest.rating).toBe(0);
      expect(rest.reviewCount).toBe(0);
    });

    test('should forbid other users from deleting someone else’s review', async () => {
      const createRes = await request(app)
        .post('/api/reviews')
        .set('Authorization', `Bearer ${token1}`)
        .send({
          restaurantId: restaurant._id.toString(),
          rating: 5,
          comment: 'Great place',
        });

      const reviewId = createRes.body._id;

      const deleteRes = await request(app)
        .delete(`/api/reviews/${reviewId}`)
        .set('Authorization', `Bearer ${token2}`);

      expect(deleteRes.statusCode).toBe(403);
    });
  });
});
