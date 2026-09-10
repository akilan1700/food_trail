// File: tests/api.test.js
// Description: Integration tests for FoodTrail backend API endpoints.
// Author: Akilan M
// Created: 2026-08-11T17:38:34+05:30

const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../src/app');
const Restaurant = require('../src/models/Restaurant');
const Dish = require('../src/models/Dish');
const Trail = require('../src/models/Trail');
const SavedTrip = require('../src/models/SavedTrip');

const TEST_MONGO_URI = 'mongodb://localhost:27017/foodtrail_test';

beforeAll(async () => {
  // Connect to the test database
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(TEST_MONGO_URI);
  }
});

afterAll(async () => {
  // Clear the database and close connection
  await mongoose.connection.db.dropDatabase();
  await mongoose.connection.close();
});

describe('FoodTrail API Integration Tests', () => {
  let sampleRestaurant;
  let sampleDish;
  let sampleTrail;

  beforeEach(async () => {
    // Clear collections before each test to start clean
    await Restaurant.deleteMany({});
    await Dish.deleteMany({});
    await Trail.deleteMany({});
    await SavedTrip.deleteMany({});

    // Seed a sample restaurant
    sampleRestaurant = new Restaurant({
      name: 'Test Cafe',
      description: 'A cozy test spot',
      address: '10 Test St, Puducherry',
      area: 'White Town',
      location: {
        type: 'Point',
        coordinates: [79.83, 11.93],
      },
      vibeTags: ['Pet-friendly', 'Outdoor garden'],
      busyStatus: 'Plenty of Tables',
      rating: 4.5,
    });
    await sampleRestaurant.save();

    // Seed a sample dish
    sampleDish = new Dish({
      name: 'Almond Croissant',
      description: 'Delicious almond paste croissant',
      price: 150,
      restaurantId: sampleRestaurant._id,
      rating: 4.8,
    });
    await sampleDish.save();

    // Seed a sample trail
    sampleTrail = new Trail({
      name: 'Test Walk',
      description: 'A pleasant walk',
      estimatedDuration: 10,
      distance: 500,
      area: 'White Town',
      stops: [
        {
          order: 1,
          restaurantId: sampleRestaurant._id,
          description: 'First stop description',
        },
      ],
    });
    await sampleTrail.save();
  });

  // 1. Health check
  test('GET /health should return 200 ok', async () => {
    const res = await request(app).get('/health');
    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  // 2. Dish Search
  test('GET /api/dishes/search should return matching dishes', async () => {
    const res = await request(app).get('/api/dishes/search?q=Almond');
    expect(res.statusCode).toBe(200);
    expect(res.body.length).toBe(1);
    expect(res.body[0].name).toBe('Almond Croissant');
  });

  test('GET /api/dishes/search should filter by vibe tags', async () => {
    // Search with matching vibe
    const resMatching = await request(app).get('/api/dishes/search?q=Almond&vibe=Pet-friendly');
    expect(resMatching.statusCode).toBe(200);
    expect(resMatching.body.length).toBe(1);

    // Search with non-matching vibe
    const resNonMatching = await request(app).get('/api/dishes/search?q=Almond&vibe=Vegan options');
    expect(resNonMatching.statusCode).toBe(200);
    expect(resNonMatching.body.length).toBe(0);
  });

  // 3. Busy Status
  test('PATCH /api/restaurants/:id/busy-status should update status', async () => {
    const res = await request(app)
      .patch(`/api/restaurants/${sampleRestaurant._id}/busy-status`)
      .send({ busyStatus: 'Filling Up' });

    expect(res.statusCode).toBe(200);
    expect(res.body.busyStatus).toBe('Filling Up');

    // Verify in db
    const updated = await Restaurant.findById(sampleRestaurant._id);
    expect(updated.busyStatus).toBe('Filling Up');
  });

  test('PATCH /api/restaurants/:id/busy-status should block invalid statuses', async () => {
    const res = await request(app)
      .patch(`/api/restaurants/${sampleRestaurant._id}/busy-status`)
      .send({ busyStatus: 'Super Crowded' }); // Invalid status

    expect(res.statusCode).toBe(400);
  });

  // 4. Trails
  test('GET /api/trails should list trails', async () => {
    const res = await request(app).get('/api/trails');
    expect(res.statusCode).toBe(200);
    expect(res.body.length).toBe(1);
    expect(res.body[0].name).toBe('Test Walk');
  });

  test('GET /api/trails/:id should return details with populated stops', async () => {
    const res = await request(app).get(`/api/trails/${sampleTrail._id}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.stops[0].restaurantId.name).toBe('Test Cafe');
  });

  test('POST /api/trails should create a new trail', async () => {
    const res = await request(app)
      .post('/api/trails')
      .send({
        name: 'New Custom Trail',
        description: 'Test Description',
        estimatedDuration: 30,
        distance: 1200,
        area: 'White Town',
        stops: [
          {
            order: 1,
            restaurantId: sampleRestaurant._id,
            description: 'Enjoy the vibe',
          },
        ],
      });

    expect(res.statusCode).toBe(201);
    expect(res.body.name).toBe('New Custom Trail');
    expect(res.body.area).toBe('White Town');
    expect(res.body.stops.length).toBe(1);
    expect(res.body.stops[0].description).toBe('Enjoy the vibe');
  });

  test('POST /api/trails allows custom area text string', async () => {
    const res = await request(app)
      .post('/api/trails')
      .send({
        name: 'Indiranagar Craft Beer & Bites Walk',
        description: 'Exploring cafes and pubs in Indiranagar',
        estimatedDuration: 45,
        distance: 2000,
        area: 'Indiranagar 12th Main',
        stops: [
          {
            order: 1,
            restaurantId: sampleRestaurant._id,
            description: 'Start with craft coffee',
          },
        ],
      });

    expect(res.statusCode).toBe(201);
    expect(res.body.name).toBe('Indiranagar Craft Beer & Bites Walk');
    expect(res.body.area).toBe('Indiranagar 12th Main');
  });

  // 5. Trip Saving & Sharing
  test('POST /api/trips and GET /api/trips/:shareId works', async () => {
    const postRes = await request(app)
      .post('/api/trips')
      .send({
        restaurantIds: [sampleRestaurant._id],
        trailId: sampleTrail._id,
      });

    expect(postRes.statusCode).toBe(201);
    expect(postRes.body.shareId).toBeDefined();

    const getRes = await request(app).get(`/api/trips/${postRes.body.shareId}`);
    expect(getRes.statusCode).toBe(200);
    expect(getRes.body.restaurantIds[0].name).toBe('Test Cafe');
    expect(getRes.body.trailId.name).toBe('Test Walk');
  });

  // 6. User Creation of Restaurants & Dishes
  test('POST /api/restaurants creates a new restaurant', async () => {
    const res = await request(app)
      .post('/api/restaurants')
      .send({
        name: 'User Created Cafe',
        description: 'Cozy user-added spot',
        address: '12 Rue Romain Rolland',
        area: 'White Town',
        coordinates: [79.8335, 11.9324],
        vibeTags: ['Cozy', 'Aesthetic'],
        photoUrl: 'some-photo-id'
      });

    expect(res.statusCode).toBe(201);
    expect(res.body.name).toBe('User Created Cafe');
    expect(res.body.area).toBe('White Town');
    expect(res.body.location.coordinates).toEqual([79.8335, 11.9324]);
  });

  test('POST /api/restaurants allows custom area text box string', async () => {
    const res = await request(app)
      .post('/api/restaurants')
      .send({
        name: 'Indiranagar Bakery Spot',
        description: 'Great sourdough',
        area: 'Indiranagar 100ft Road',
        coordinates: [77.6408, 12.9784],
        vibeTags: ['Bakery'],
      });

    expect(res.statusCode).toBe(201);
    expect(res.body.name).toBe('Indiranagar Bakery Spot');
    expect(res.body.area).toBe('Indiranagar 100ft Road');
    expect(res.body.location.coordinates).toEqual([77.6408, 12.9784]);
  });

  test('POST /api/restaurants validation fails on missing name', async () => {
    const res = await request(app)
      .post('/api/restaurants')
      .send({
        area: 'White Town',
        coordinates: [79.8335, 11.9324]
      });

    expect(res.statusCode).toBe(400);
    expect(res.body.error.message).toContain('name is required');
  });

  test('POST /api/dishes creates a new dish for a restaurant', async () => {
    const res = await request(app)
      .post('/api/dishes')
      .send({
        name: 'User Created Dish',
        description: 'Yummy dish',
        price: 250,
        photoUrl: 'some-dish-photo',
        restaurantId: sampleRestaurant._id,
        isSignature: true
      });

    expect(res.statusCode).toBe(201);
    expect(res.body.name).toBe('User Created Dish');
    expect(res.body.price).toBe(250);
    expect(res.body.restaurantId).toBe(sampleRestaurant._id.toString());
  });

  test('POST /api/dishes validation fails on non-existent restaurant', async () => {
    const fakeId = new mongoose.Types.ObjectId();
    const res = await request(app)
      .post('/api/dishes')
      .send({
        name: 'User Created Dish',
        price: 250,
        restaurantId: fakeId
      });

    expect(res.statusCode).toBe(404);
    expect(res.body.error.message).toContain('restaurant not found');
  });
});
