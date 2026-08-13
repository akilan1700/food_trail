// File: tests/auth.test.js
// Description: Integration tests for OTP authentication, verification, and user profiles.
// Author: Akilan M
// Created: 2026-08-13T11:15:30+05:30

const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../src/app');
const User = require('../src/models/User');
const Otp = require('../src/models/Otp');
const UserProfile = require('../src/models/UserProfile');

const TEST_MONGO_URI = 'mongodb://localhost:27017/foodtrail_test';

beforeAll(async () => {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(TEST_MONGO_URI);
  }
});

afterAll(async () => {
  await mongoose.connection.db.dropDatabase();
  await mongoose.connection.close();
});

describe('Authentication API Integration Tests', () => {
  beforeEach(async () => {
    await User.deleteMany({});
    await Otp.deleteMany({});
    await UserProfile.deleteMany({});
  });

  describe('POST /api/auth/signup/request', () => {
    test('should generate and send OTP for new email', async () => {
      const res = await request(app)
        .post('/api/auth/signup/request')
        .send({ email: 'newuser@example.com', name: 'New User' });

      expect(res.statusCode).toBe(200);
      expect(res.body.message).toContain('Verification OTP sent');

      const otpRecord = await Otp.findOne({ email: 'newuser@example.com' });
      expect(otpRecord).toBeDefined();
      expect(otpRecord.otp).toHaveLength(6);
      expect(otpRecord.name).toBe('New User');
      expect(otpRecord.type).toBe('signup');
    });

    test('should block signup if email already exists', async () => {
      const user = new User({ email: 'existing@example.com', name: 'Existing User' });
      await user.save();

      const res = await request(app)
        .post('/api/auth/signup/request')
        .send({ email: 'existing@example.com', name: 'Duplicate User' });

      expect(res.statusCode).toBe(400);
      expect(res.body.error.message).toContain('already registered');
    });

    test('should validate input parameters', async () => {
      const res = await request(app)
        .post('/api/auth/signup/request')
        .send({ email: 'invalid-email', name: '' });

      expect(res.statusCode).toBe(400);
    });
  });

  describe('POST /api/auth/login/request', () => {
    test('should send OTP if user exists', async () => {
      const user = new User({ email: 'registered@example.com', name: 'Registered User' });
      await user.save();

      const res = await request(app)
        .post('/api/auth/login/request')
        .send({ email: 'registered@example.com' });

      expect(res.statusCode).toBe(200);

      const otpRecord = await Otp.findOne({ email: 'registered@example.com' });
      expect(otpRecord).toBeDefined();
      expect(otpRecord.type).toBe('login');
    });

    test('should return 404 if user not registered', async () => {
      const res = await request(app)
        .post('/api/auth/login/request')
        .send({ email: 'nonexistent@example.com' });

      expect(res.statusCode).toBe(404);
      expect(res.body.error.message).toContain('User not found');
    });
  });

  describe('POST /api/auth/verify', () => {
    test('should verify correct OTP and register new user on signup', async () => {
      // Setup OTP record
      const otp = '999999';
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
      const otpRecord = new Otp({
        email: 'verify-signup@example.com',
        otp,
        type: 'signup',
        name: 'Verify Me',
        expiresAt,
      });
      await otpRecord.save();

      const res = await request(app)
        .post('/api/auth/verify')
        .send({ email: 'verify-signup@example.com', otp });

      expect(res.statusCode).toBe(200);
      expect(res.body.token).toBeDefined();
      expect(res.body.user.name).toBe('Verify Me');
      expect(res.body.user.email).toBe('verify-signup@example.com');
      expect(res.body.user.profile).toBeDefined();

      const createdUser = await User.findOne({ email: 'verify-signup@example.com' });
      expect(createdUser).toBeDefined();
      expect(createdUser.name).toBe('Verify Me');

      const createdProfile = await UserProfile.findOne({ userId: createdUser._id });
      expect(createdProfile).toBeDefined();
      expect(createdProfile.phoneNumber).toBe('');
    });

    test('should verify correct OTP and return token on login', async () => {
      const user = new User({ email: 'verify-login@example.com', name: 'Login Me' });
      await user.save();

      const otp = '888888';
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
      const otpRecord = new Otp({
        email: 'verify-login@example.com',
        otp,
        type: 'login',
        expiresAt,
      });
      await otpRecord.save();

      const res = await request(app)
        .post('/api/auth/verify')
        .send({ email: 'verify-login@example.com', otp });

      expect(res.statusCode).toBe(200);
      expect(res.body.token).toBeDefined();
      expect(res.body.user.name).toBe('Login Me');
    });

    test('should reject invalid OTP', async () => {
      const otpRecord = new Otp({
        email: 'bad@example.com',
        otp: '123456',
        type: 'login',
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
      });
      await otpRecord.save();

      const res = await request(app)
        .post('/api/auth/verify')
        .send({ email: 'bad@example.com', otp: '111111' });

      expect(res.statusCode).toBe(400);
      expect(res.body.error.message).toContain('Invalid');
    });
  });

  describe('GET & PUT /api/auth/profile', () => {
    let userToken;
    let registeredUser;

    beforeEach(async () => {
      registeredUser = new User({
        email: 'profile-owner@example.com',
        name: 'Profile Owner',
        settings: { notificationsEnabled: true, preferredTheme: 'Dark' },
      });
      await registeredUser.save();

      // Sign in to get token
      const otp = '112233';
      const otpRecord = new Otp({
        email: 'profile-owner@example.com',
        otp,
        type: 'login',
        expiresAt: new Date(Date.now() + 5 * 60 * 1000),
      });
      await otpRecord.save();

      const res = await request(app)
        .post('/api/auth/verify')
        .send({ email: 'profile-owner@example.com', otp });

      userToken = res.body.token;
    });

    test('should fetch currently logged in user profile', async () => {
      const res = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.statusCode).toBe(200);
      expect(res.body.user.name).toBe('Profile Owner');
      expect(res.body.user.email).toBe('profile-owner@example.com');
    });

    test('should reject unauthenticated profile fetches', async () => {
      const res = await request(app)
        .get('/api/auth/profile');

      expect(res.statusCode).toBe(401);
    });

    test('should update user name, settings, and profile details', async () => {
      const res = await request(app)
        .put('/api/auth/profile')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          name: 'Updated Owner Name',
          settings: { notificationsEnabled: false, preferredTheme: 'Light' },
          profile: {
            phoneNumber: '+919876543210',
            bio: 'Avid traveler and foodie.',
            dateOfBirth: '1995-05-15',
            city: 'Pondicherry',
            favoriteCuisine: 'French-Creole',
          },
        });

      expect(res.statusCode).toBe(200);
      expect(res.body.user.name).toBe('Updated Owner Name');
      expect(res.body.user.settings.notificationsEnabled).toBe(false);
      expect(res.body.user.settings.preferredTheme).toBe('Light');
      expect(res.body.user.profile.phoneNumber).toBe('+919876543210');
      expect(res.body.user.profile.bio).toBe('Avid traveler and foodie.');
      expect(res.body.user.profile.city).toBe('Pondicherry');
      expect(res.body.user.profile.favoriteCuisine).toBe('French-Creole');

      const dbUser = await User.findById(registeredUser._id);
      expect(dbUser.name).toBe('Updated Owner Name');
      expect(dbUser.settings.notificationsEnabled).toBe(false);
      expect(dbUser.settings.preferredTheme).toBe('Light');

      const dbProfile = await UserProfile.findOne({ userId: registeredUser._id });
      expect(dbProfile.phoneNumber).toBe('+919876543210');
      expect(dbProfile.bio).toBe('Avid traveler and foodie.');
      expect(new Date(dbProfile.dateOfBirth).toISOString().split('T')[0]).toBe('1995-05-15');
      expect(dbProfile.city).toBe('Pondicherry');
      expect(dbProfile.favoriteCuisine).toBe('French-Creole');
    });
  });
});
