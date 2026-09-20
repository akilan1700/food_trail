// File: tests/googleMapsResolver.test.js
// Description: Unit and integration tests for Google Maps link resolver, coordinate extraction, and SSRF security controls.
// Author: Akilan M
// Created: 2026-09-20T20:03:12+05:30

const request = require('supertest');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const app = require('../src/app');
const Admin = require('../src/models/Admin');
const {
  validateGoogleMapsUrl,
  extractFromUrlString,
  parseRawCoordinates,
  resolveGoogleMapsUrl,
} = require('../src/services/googleMapsResolver');
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

describe('Google Maps Resolver Unit & Security Tests', () => {
  describe('validateGoogleMapsUrl', () => {
    test('should accept valid Google Maps URLs', () => {
      expect(() =>
        validateGoogleMapsUrl('https://www.google.com/maps/place/Coromandel+Cafe/@11.932454,79.833532,17z')
      ).not.toThrow();

      expect(() =>
        validateGoogleMapsUrl('https://maps.app.goo.gl/abc123xyz')
      ).not.toThrow();

      expect(() =>
        validateGoogleMapsUrl('https://goo.gl/maps/xyz789')
      ).not.toThrow();

      expect(() =>
        validateGoogleMapsUrl('https://maps.google.co.in/?q=11.9324,79.8335')
      ).not.toThrow();
    });

    test('should block non-Google URLs and private IPs (SSRF protection)', () => {
      expect(() => validateGoogleMapsUrl('http://127.0.0.1:8080/admin')).toThrow('private or local networks');
      expect(() => validateGoogleMapsUrl('http://localhost:5001/secret')).toThrow('private or local networks');
      expect(() => validateGoogleMapsUrl('http://169.254.169.254/latest/meta-data')).toThrow('private or local networks');
      expect(() => validateGoogleMapsUrl('https://malicious-site.com/exploit')).toThrow('Untrusted URL host');
      expect(() => validateGoogleMapsUrl('ftp://www.google.com/maps')).toThrow('Only HTTP and HTTPS are permitted');
    });
  });

  describe('extractFromUrlString', () => {
    test('should extract coordinates and place name from /maps/place/@lat,lng', () => {
      const url = 'https://www.google.com/maps/place/Coromandel+Cafe/@11.9324545,79.833532,17z/data=!3m1!4b1';
      const result = extractFromUrlString(url);
      expect(result).not.toBeNull();
      expect(result.latitude).toBeCloseTo(11.9324545, 5);
      expect(result.longitude).toBeCloseTo(79.833532, 5);
      expect(result.placeName).toBe('Coromandel Cafe');
    });

    test('should extract coordinates from !3d and !4d data parameters', () => {
      const url = 'https://www.google.com/maps/place/Hotel+Promenade/data=!4m2!3m1!1s0x0:0x0!3d11.9345!4d79.8355';
      const result = extractFromUrlString(url);
      expect(result).not.toBeNull();
      expect(result.latitude).toBeCloseTo(11.9345, 4);
      expect(result.longitude).toBeCloseTo(79.8355, 4);
      expect(result.placeName).toBe('Hotel Promenade');
    });

    test('should extract coordinates from embed !2d[lng]!3d[lat] pb parameters', () => {
      const url = 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3903.65!2d79.833532!3d11.932454!2m3!1f0!2f0!3f0';
      const result = extractFromUrlString(url);
      expect(result).not.toBeNull();
      expect(result.latitude).toBeCloseTo(11.932454, 5);
      expect(result.longitude).toBeCloseTo(79.833532, 5);
    });

    test('should extract coordinates from query string ?q=lat,lng', () => {
      const url = 'https://www.google.com/maps?q=11.931234,79.839876';
      const result = extractFromUrlString(url);
      expect(result).not.toBeNull();
      expect(result.latitude).toBeCloseTo(11.931234, 5);
      expect(result.longitude).toBeCloseTo(79.839876, 5);
    });
  });

  describe('parseRawCoordinates', () => {
    test('should parse standard decimal coordinates', () => {
      const result = parseRawCoordinates('11.932454, 79.833532');
      expect(result).not.toBeNull();
      expect(result.latitude).toBeCloseTo(11.932454, 5);
      expect(result.longitude).toBeCloseTo(79.833532, 5);
    });

    test('should parse DMS format coordinates', () => {
      const result = parseRawCoordinates('11°55\'56.8"N 79°50\'00.7"E');
      expect(result).not.toBeNull();
      expect(result.latitude).toBeCloseTo(11.932444, 4);
      expect(result.longitude).toBeCloseTo(79.833527, 4);
    });

    test('should return null for invalid text', () => {
      expect(parseRawCoordinates('some random text')).toBeNull();
      expect(parseRawCoordinates('')).toBeNull();
    });
  });

  describe('resolveGoogleMapsUrl integration', () => {
    test('should resolve direct Google Maps URL instantly', async () => {
      const url = 'https://www.google.com/maps/place/Cafe+des+Arts/@11.9315,79.8340,17z';
      const result = await resolveGoogleMapsUrl(url);
      expect(result.latitude).toBeCloseTo(11.9315, 4);
      expect(result.longitude).toBeCloseTo(79.8340, 4);
      expect(result.placeName).toBe('Cafe des Arts');
    });

    test('should resolve embed iframe html snippet', async () => {
      const snippet = '<iframe src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3903.65!2d79.8335!3d11.9324!2m3" width="600" height="450"></iframe>';
      const result = await resolveGoogleMapsUrl(snippet);
      expect(result.latitude).toBeCloseTo(11.9324, 4);
      expect(result.longitude).toBeCloseTo(79.8335, 4);
    });
  });
});

describe('POST /api/admin/resolve-maps-url Endpoint', () => {
  let adminToken;

  beforeEach(async () => {
    await Admin.deleteMany({});
    const admin = new Admin({
      email: 'admin_maps@foodtrail.com',
      name: 'Maps Admin',
      mpin: '123456',
      role: 'admin',
    });
    await admin.save();

    adminToken = jwt.sign(
      { adminId: admin._id, role: admin.role, email: admin.email },
      JWT_SECRET,
      { expiresIn: '1d' }
    );
  });

  test('should require admin authentication', async () => {
    const res = await request(app)
      .post('/api/admin/resolve-maps-url')
      .send({ url: 'https://www.google.com/maps/place/Test/@11.9324,79.8335,17z' });
    expect(res.status).toBe(401);
  });

  test('should resolve Google Maps URL successfully with admin token', async () => {
    const res = await request(app)
      .post('/api/admin/resolve-maps-url')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ url: 'https://www.google.com/maps/place/Coromandel+Cafe/@11.932454,79.833532,17z' });

    expect(res.status).toBe(200);
    expect(res.body.latitude).toBeCloseTo(11.932454, 4);
    expect(res.body.longitude).toBeCloseTo(79.833532, 4);
    expect(res.body.placeName).toBe('Coromandel Cafe');
  });

  test('should reject malicious SSRF attempts with 400 error', async () => {
    const res = await request(app)
      .post('/api/admin/resolve-maps-url')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ url: 'http://127.0.0.1:5001/admin/secret' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });
});
