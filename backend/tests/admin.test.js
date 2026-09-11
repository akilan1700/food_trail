// File: tests/admin.test.js
// Description: Integration tests for Admin model, Admin authentication, and Admin management endpoints.
// Author: Akilan M
// Updated: 2026-09-11

const request = require('supertest');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const app = require('../src/app');
const Admin = require('../src/models/Admin');
const User = require('../src/models/User');
const Restaurant = require('../src/models/Restaurant');
const Dish = require('../src/models/Dish');

const { getJwtSecret } = require('../src/utils/jwtSecret');

const TEST_MONGO_URI = 'mongodb://localhost:27017/foodtrail_test';
const JWT_SECRET = getJwtSecret();

beforeAll(async () => {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(TEST_MONGO_URI);
  }
});

afterAll(async () => {
  await mongoose.connection.db.dropDatabase();
  await mongoose.connection.close();
});

describe('Admin Authentication & Management API Tests', () => {
  let sampleAdmin;
  let adminToken;
  let regularUser;
  let sampleRestaurant;
  let sampleDish;

  beforeEach(async () => {
    // Clear collections
    await Admin.deleteMany({});
    await User.deleteMany({});
    await Restaurant.deleteMany({});
    await Dish.deleteMany({});

    // Create a sample admin in Admin collection
    sampleAdmin = new Admin({
      email: 'admin@foodtrail.com',
      name: 'Super Admin',
      mpin: '123456',
      role: 'admin',
    });
    await sampleAdmin.save();

    // Sign admin token for authenticated requests
    adminToken = jwt.sign(
      { adminId: sampleAdmin._id, role: sampleAdmin.role, email: sampleAdmin.email },
      JWT_SECRET,
      { expiresIn: '1d' }
    );

    // Create a regular user in User collection
    regularUser = new User({
      email: 'user@foodtrail.com',
      name: 'Normal User',
      mpin: '111111',
    });
    await regularUser.save();

    // Create a sample restaurant
    sampleRestaurant = new Restaurant({
      name: 'Coromandel Cafe',
      description: 'Charming heritage cafe',
      area: 'White Town',
      location: {
        type: 'Point',
        coordinates: [79.833, 11.933],
      },
      vibeTags: ['Cozy', 'Aesthetic'],
      busyStatus: 'Plenty of Tables',
      rating: 4.8,
    });
    await sampleRestaurant.save();

    // Create a sample dish
    sampleDish = new Dish({
      name: 'Avocado Toast',
      description: 'Sourdough toast with poached egg',
      price: 320,
      restaurantId: sampleRestaurant._id,
      isSignature: true,
      rating: 4.9,
    });
    await sampleDish.save();
  });

  // 1. Admin Login Tests
  test('POST /api/admin/login should authenticate valid admin credentials', async () => {
    const res = await request(app)
      .post('/api/admin/login')
      .send({
        email: 'admin@foodtrail.com',
        mpin: '123456',
      });

    expect(res.statusCode).toBe(200);
    expect(res.body.token).toBeDefined();
    expect(res.body.admin.email).toBe('admin@foodtrail.com');
    expect(res.body.admin.role).toBe('admin');
  });

  test('POST /api/admin/login should reject incorrect MPIN', async () => {
    const res = await request(app)
      .post('/api/admin/login')
      .send({
        email: 'admin@foodtrail.com',
        mpin: '999999',
      });

    expect(res.statusCode).toBe(401);
    expect(res.body.error.message).toContain('Invalid administrator email or MPIN');
  });

  test('POST /api/admin/login should reject regular user email not in Admin collection', async () => {
    const res = await request(app)
      .post('/api/admin/login')
      .send({
        email: 'user@foodtrail.com',
        mpin: '111111',
      });

    expect(res.statusCode).toBe(401);
    expect(res.body.error.message).toContain('Invalid administrator email or MPIN');
  });

  // 3. Admin Me & Auth Middleware Guard
  test('GET /api/admin/me should return admin profile when authenticated', async () => {
    const res = await request(app)
      .get('/api/admin/me')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.admin.email).toBe('admin@foodtrail.com');
  });

  test('GET /api/admin/me should return 401 when token is missing', async () => {
    const res = await request(app).get('/api/admin/me');
    expect(res.statusCode).toBe(401);
  });

  test('GET /api/admin/me should return 403 when token belongs to regular user', async () => {
    const userToken = jwt.sign({ userId: regularUser._id }, JWT_SECRET, { expiresIn: '1d' });
    const res = await request(app)
      .get('/api/admin/me')
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.statusCode).toBe(403);
  });

  // 4. Admin Stats Endpoint
  test('GET /api/admin/stats should return live counts', async () => {
    const res = await request(app)
      .get('/api/admin/stats')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.totalRestaurants).toBe(1);
    expect(res.body.totalDishes).toBe(1);
    expect(res.body.totalSignatureDishes).toBe(1);
    expect(res.body.totalUsers).toBe(1);
  });

  // 5. Admin Restaurant Management
  test('GET /api/admin/restaurants should return restaurants with dish counts', async () => {
    const res = await request(app)
      .get('/api/admin/restaurants')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.length).toBe(1);
    expect(res.body[0].name).toBe('Coromandel Cafe');
    expect(res.body[0].totalDishes).toBe(1);
    expect(res.body[0].signatureDishes).toBe(1);
  });

  test('POST /api/admin/restaurants should create a new restaurant', async () => {
    const res = await request(app)
      .post('/api/admin/restaurants')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Villa Shanti',
        description: 'French & Indian fine dining',
        area: 'White Town',
        coordinates: [79.834, 11.934],
        vibeTags: ['Fine Dining', 'Courtyard'],
      });

    expect(res.statusCode).toBe(201);
    expect(res.body.name).toBe('Villa Shanti');
    expect(res.body.location.coordinates).toEqual([79.834, 11.934]);
  });

  test('PUT /api/admin/restaurants/:id should update restaurant info', async () => {
    const res = await request(app)
      .put(`/api/admin/restaurants/${sampleRestaurant._id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        busyStatus: 'Filling Up',
        rating: 4.9,
      });

    expect(res.statusCode).toBe(200);
    expect(res.body.busyStatus).toBe('Filling Up');
    expect(res.body.rating).toBe(4.9);
  });

  // 6. Admin Dish & Signature Dish Management
  test('POST /api/admin/dishes should add a signature dish for a restaurant', async () => {
    const res = await request(app)
      .post('/api/admin/dishes')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Puducherry Fish Curry',
        description: 'Authentic local specialty with coconut milk',
        price: 380,
        restaurantId: sampleRestaurant._id,
        isSignature: true,
      });

    expect(res.statusCode).toBe(201);
    expect(res.body.name).toBe('Puducherry Fish Curry');
    expect(res.body.isSignature).toBe(true);
    expect(res.body.price).toBe(380);
  });

  test('PATCH /api/admin/dishes/:id/toggle-signature should toggle signature status', async () => {
    expect(sampleDish.isSignature).toBe(true);

    const res = await request(app)
      .patch(`/api/admin/dishes/${sampleDish._id}/toggle-signature`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.isSignature).toBe(false);

    // Toggle back
    const res2 = await request(app)
      .patch(`/api/admin/dishes/${sampleDish._id}/toggle-signature`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res2.statusCode).toBe(200);
    expect(res2.body.isSignature).toBe(true);
  });

  test('PUT /api/admin/dishes/:id should update dish properties', async () => {
    const res = await request(app)
      .put(`/api/admin/dishes/${sampleDish._id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Avocado Toast with Salmon',
        price: 450,
      });

    expect(res.statusCode).toBe(200);
    expect(res.body.name).toBe('Avocado Toast with Salmon');
    expect(res.body.price).toBe(450);
  });

  test('DELETE /api/admin/dishes/:id should delete a dish', async () => {
    const res = await request(app)
      .delete(`/api/admin/dishes/${sampleDish._id}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.statusCode).toBe(200);

    const found = await Dish.findById(sampleDish._id);
    expect(found).toBeNull();
  });

  test('DELETE /api/admin/restaurants/:id should delete restaurant and cascade delete dishes', async () => {
    const res = await request(app)
      .delete(`/api/admin/restaurants/${sampleRestaurant._id}`)
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.statusCode).toBe(200);

    const foundRest = await Restaurant.findById(sampleRestaurant._id);
    expect(foundRest).toBeNull();

    const foundDishes = await Dish.find({ restaurantId: sampleRestaurant._id });
    expect(foundDishes.length).toBe(0);
  });

  // 7. Admin Users List
  test('GET /api/admin/users should list registered users', async () => {
    const res = await request(app)
      .get('/api/admin/users')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.statusCode).toBe(200);
    const users = Array.isArray(res.body) ? res.body : res.body.data;
    expect(users.length).toBe(1);
    expect(users[0].email).toBe('user@foodtrail.com');
    expect(users[0].mpin).toBeUndefined();
  });
});
