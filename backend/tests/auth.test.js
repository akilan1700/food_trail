// File: tests/auth.test.js
// Description: Integration tests for OTP authentication, verification, and user profiles.
// Author: Akilan M
// Created: 2026-08-13T11:15:30+05:30

const request = require('supertest');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const app = require('../src/app');
const User = require('../src/models/User');
const Otp = require('../src/models/Otp');
const UserProfile = require('../src/models/UserProfile');

jest.mock('../src/services/emailService', () => ({
  sendOtpEmail: jest.fn().mockResolvedValue(true),
}));

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

  describe('POST /api/auth/signup', () => {
    test('should initiate signup and verify user with email and OTP', async () => {
      const res = await request(app)
        .post('/api/auth/signup')
        .send({ email: 'newuser@example.com', name: 'New User', mpin: '123456' });

      expect(res.statusCode).toBe(200);
      expect(res.body.status).toBe('otp_required');
      expect(res.body.email).toBe('newuser@example.com');
      expect(res.body.type).toBe('signup');

      const otpRecord = await Otp.findOne({ email: 'newuser@example.com', type: 'signup' });
      expect(otpRecord).toBeDefined();
      expect(otpRecord.otp).toBeDefined();

      const verifyRes = await request(app)
        .post('/api/auth/verify')
        .send({ email: 'newuser@example.com', otp: otpRecord.otp, type: 'signup' });

      expect(verifyRes.statusCode).toBe(200);
      expect(verifyRes.body.token).toBeDefined();
      expect(verifyRes.body.user.name).toBe('New User');
      expect(verifyRes.body.user.email).toBe('newuser@example.com');

      const createdUser = await User.findOne({ email: 'newuser@example.com' });
      expect(createdUser).toBeDefined();
      expect(createdUser.name).toBe('New User');
      expect(createdUser.compareMpin('123456')).toBe(true);

      const createdProfile = await UserProfile.findOne({ userId: createdUser._id });
      expect(createdProfile).toBeDefined();
    });

    test('should block signup if email already exists', async () => {
      const user = new User({ email: 'existing@example.com', name: 'Existing User', mpin: '1234' });
      await user.save();

      const res = await request(app)
        .post('/api/auth/signup')
        .send({ email: 'existing@example.com', name: 'Duplicate User', mpin: '5678' });

      expect(res.statusCode).toBe(400);
      expect(res.body.error.message).toContain('already registered');
    });

    test('should validate input parameters', async () => {
      const res = await request(app)
        .post('/api/auth/signup')
        .send({ email: 'invalid-email', name: '', mpin: '12' });

      expect(res.statusCode).toBe(400);
    });
  });

  describe('POST /api/auth/login', () => {
    test('should authenticate login and return JWT token and user profile directly with valid MPIN', async () => {
      const user = new User({ email: 'registered@example.com', name: 'Registered User', mpin: '112233' });
      await user.save();

      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'registered@example.com', mpin: '112233' });

      expect(res.statusCode).toBe(200);
      expect(res.body.token).toBeDefined();
      expect(res.body.user.name).toBe('Registered User');
      expect(res.body.user.email).toBe('registered@example.com');
      expect(res.headers['set-cookie']).toBeDefined();
    });

    test('should reject invalid mpin', async () => {
      const user = new User({ email: 'registered@example.com', name: 'Registered User', mpin: '112233' });
      await user.save();

      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'registered@example.com', mpin: '999999' });

      expect(res.statusCode).toBe(401);
      expect(res.body.error.message).toContain('Invalid email or PIN');
    });

    test('should return 401 if user not registered', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({ email: 'nonexistent@example.com', mpin: '1234' });

      expect(res.statusCode).toBe(401);
      expect(res.body.error.message).toContain('Invalid email or PIN');
    });
  });

  describe('GET & PUT /api/auth/profile', () => {
    let userToken;
    let registeredUser;

    beforeEach(async () => {
      registeredUser = new User({
        email: 'profile-owner@example.com',
        name: 'Profile Owner',
        mpin: '112233',
        settings: { notificationsEnabled: true, preferredTheme: 'Dark' },
      });
      await registeredUser.save();

      // Sign in directly with MPIN to get token
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({ email: 'profile-owner@example.com', mpin: '112233' });

      userToken = loginRes.body.token;
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

    test('should record completed walks and update user stats', async () => {
      const trailId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .post('/api/auth/profile/complete-walk')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ trailId: trailId.toString() });

      expect(res.statusCode).toBe(200);
      expect(res.body.user.profile.walksCompleted).toBe(1);

      // Verify in db user profile
      const dbProfile = await UserProfile.findOne({ userId: registeredUser._id });
      expect(dbProfile.walksCompletedCount).toBe(1);
      expect(dbProfile.completedTrails[0].toString()).toBe(trailId.toString());
    });

    test('should reject unauthenticated completed walk records', async () => {
      const res = await request(app)
        .post('/api/auth/profile/complete-walk')
        .send({ trailId: new mongoose.Types.ObjectId().toString() });

      expect(res.statusCode).toBe(401);
    });

    test('should reject expired session token with descriptive 401 message', async () => {
      const { getJwtSecret } = require('../src/utils/jwtSecret');
      const expiredToken = jwt.sign({ userId: registeredUser._id }, getJwtSecret(), { expiresIn: '0s' });

      const res = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${expiredToken}`);

      expect(res.statusCode).toBe(401);
      expect(res.body.error.message).toContain('Session expired');
    });

    test('should clear authentication cookie on logout', async () => {
      const res = await request(app).post('/api/auth/logout');
      expect(res.statusCode).toBe(200);
      expect(res.body.message).toBe('Logged out successfully');
    });
  });
});
