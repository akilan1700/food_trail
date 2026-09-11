// File: tests/api.test.js
// Description: Integration tests for FoodTrail backend API endpoints (auth-required writes, paginated lists).
// Author: Akilan M
// Updated: 2026-09-11

const request = require('supertest');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const app = require('../src/app');
const Restaurant = require('../src/models/Restaurant');
const Dish = require('../src/models/Dish');
const Trail = require('../src/models/Trail');
const SavedTrip = require('../src/models/SavedTrip');
const User = require('../src/models/User');
const { getJwtSecret } = require('../src/utils/jwtSecret');

const TEST_MONGO_URI = 'mongodb://localhost:27017/foodtrail_test';

/**
 * Unwraps paginated or legacy array responses.
 * @param {object|Array} body
 * @returns {Array}
 */
function listData(body) {
  if (Array.isArray(body)) return body;
  if (body && Array.isArray(body.data)) return body.data;
  return [];
}

beforeAll(async () => {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(TEST_MONGO_URI);
  }
});

afterAll(async () => {
  await mongoose.connection.db.dropDatabase();
  await mongoose.connection.close();
});

describe('FoodTrail API Integration Tests', () => {
  let sampleRestaurant;
  let sampleDish;
  let sampleTrail;
  let testUser;
  let userToken;

  beforeEach(async () => {
    await Restaurant.deleteMany({});
    await Dish.deleteMany({});
    await Trail.deleteMany({});
    await SavedTrip.deleteMany({});
    await User.deleteMany({});

    testUser = new User({
      email: 'api-user@foodtrail.com',
      name: 'API User',
      mpin: '123456',
    });
    await testUser.save();
    userToken = jwt.sign({ userId: testUser._id }, getJwtSecret(), { expiresIn: '1d' });

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
      createdBy: testUser._id,
    });
    await sampleRestaurant.save();

    sampleDish = new Dish({
      name: 'Almond Croissant',
      description: 'Delicious almond paste croissant',
      price: 150,
      restaurantId: sampleRestaurant._id,
      rating: 4.8,
    });
    await sampleDish.save();

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
      createdBy: testUser._id,
    });
    await sampleTrail.save();
  });

  test('GET /health should return 200 ok', async () => {
    const res = await request(app).get('/health');
    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe('ok');
  });

  test('GET /api/dishes/search should return matching dishes', async () => {
    const res = await request(app).get('/api/dishes/search?q=Almond');
    expect(res.statusCode).toBe(200);
    const rows = listData(res.body);
    expect(rows.length).toBe(1);
    expect(rows[0].name).toBe('Almond Croissant');
  });

  test('GET /api/dishes/search should filter by vibe tags', async () => {
    const resMatching = await request(app).get('/api/dishes/search?q=Almond&vibe=Pet-friendly');
    expect(resMatching.statusCode).toBe(200);
    expect(listData(resMatching.body).length).toBe(1);

    const resNonMatching = await request(app).get('/api/dishes/search?q=Almond&vibe=Vegan options');
    expect(resNonMatching.statusCode).toBe(200);
    expect(listData(resNonMatching.body).length).toBe(0);
  });

  test('PATCH /api/restaurants/:id/busy-status requires auth', async () => {
    const res = await request(app)
      .patch(`/api/restaurants/${sampleRestaurant._id}/busy-status`)
      .send({ busyStatus: 'Filling Up' });
    expect(res.statusCode).toBe(401);
  });

  test('PATCH /api/restaurants/:id/busy-status works for any authenticated user', async () => {
    const other = new User({
      email: 'other@foodtrail.com',
      name: 'Other User',
      mpin: '654321',
    });
    await other.save();
    const otherToken = jwt.sign({ userId: other._id }, getJwtSecret(), { expiresIn: '1d' });

    const res = await request(app)
      .patch(`/api/restaurants/${sampleRestaurant._id}/busy-status`)
      .set('Authorization', `Bearer ${otherToken}`)
      .send({ busyStatus: 'Closed' });

    expect(res.statusCode).toBe(200);
    expect(res.body.busyStatus).toBe('Closed');
  });

  test('PATCH /api/restaurants/:id/busy-status should block invalid statuses', async () => {
    const res = await request(app)
      .patch(`/api/restaurants/${sampleRestaurant._id}/busy-status`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({ busyStatus: 'Super Crowded' });

    expect(res.statusCode).toBe(400);
  });

  test('GET /api/trails should list trails', async () => {
    const res = await request(app).get('/api/trails');
    expect(res.statusCode).toBe(200);
    const rows = listData(res.body);
    expect(rows.length).toBe(1);
    expect(rows[0].name).toBe('Test Walk');
  });

  test('GET /api/trails/:id should return details with populated stops', async () => {
    const res = await request(app).get(`/api/trails/${sampleTrail._id}`);
    expect(res.statusCode).toBe(200);
    expect(res.body.stops[0].restaurantId.name).toBe('Test Cafe');
  });

  test('POST /api/trails requires auth', async () => {
    const res = await request(app)
      .post('/api/trails')
      .send({
        name: 'New Custom Trail',
        estimatedDuration: 30,
        distance: 1200,
        area: 'White Town',
      });
    expect(res.statusCode).toBe(401);
  });

  test('POST /api/trails should create a new trail when authenticated', async () => {
    const res = await request(app)
      .post('/api/trails')
      .set('Authorization', `Bearer ${userToken}`)
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
  });

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

  test('POST /api/restaurants requires auth', async () => {
    const res = await request(app)
      .post('/api/restaurants')
      .send({
        name: 'User Created Cafe',
        area: 'White Town',
        coordinates: [79.8335, 11.9324],
      });
    expect(res.statusCode).toBe(401);
  });

  test('POST /api/restaurants creates a new restaurant when authenticated', async () => {
    const res = await request(app)
      .post('/api/restaurants')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        name: 'User Created Cafe',
        description: 'Cozy user-added spot',
        address: '12 Rue Romain Rolland',
        area: 'White Town',
        coordinates: [79.8335, 11.9324],
        vibeTags: ['Cozy', 'Aesthetic'],
        photoUrl: 'some-photo-id',
      });

    expect(res.statusCode).toBe(201);
    expect(res.body.name).toBe('User Created Cafe');
    expect(res.body.createdBy).toBe(testUser._id.toString());
  });

  test('POST /api/restaurants validation fails on missing name', async () => {
    const res = await request(app)
      .post('/api/restaurants')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        area: 'White Town',
        coordinates: [79.8335, 11.9324],
      });

    expect(res.statusCode).toBe(400);
    expect(res.body.error.message).toContain('name is required');
  });

  test('GET /api/restaurants/my-spots returns only spots created by the authenticated user', async () => {
    const res = await request(app)
      .get('/api/restaurants/my-spots')
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.length).toBe(1);
    expect(res.body[0].name).toBe('Test Cafe');
  });

  test('POST /api/dishes requires auth', async () => {
    const res = await request(app)
      .post('/api/dishes')
      .send({
        name: 'User Created Dish',
        price: 250,
        restaurantId: sampleRestaurant._id,
      });
    expect(res.statusCode).toBe(401);
  });

  test('POST /api/dishes creates a new dish for a restaurant', async () => {
    const res = await request(app)
      .post('/api/dishes')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        name: 'User Created Dish',
        description: 'Yummy dish',
        price: 250,
        photoUrl: 'some-dish-photo',
        restaurantId: sampleRestaurant._id,
        isSignature: true,
      });

    expect(res.statusCode).toBe(201);
    expect(res.body.name).toBe('User Created Dish');
    expect(res.body.price).toBe(250);
  });

  test('POST /api/upload requires auth', async () => {
    const res = await request(app).post('/api/upload');
    expect(res.statusCode).toBe(401);
  });
});
