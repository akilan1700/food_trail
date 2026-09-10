// File: tests/cloudinary.test.js
// Description: Unit test suite for Cloudinary service upload, deletion, and public ID extraction.
// Author: Akilan M
// Created: 2026-09-10T10:30:15+05:30

const { Writable } = require('stream');

// Mock cloudinary SDK before importing service
jest.mock('cloudinary', () => {
  return {
    v2: {
      config: jest.fn(),
      uploader: {
        upload_stream: jest.fn(),
        destroy: jest.fn(),
      },
    },
  };
});

describe('Cloudinary Service Unit Tests', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = {
      ...originalEnv,
      CLOUDINARY_CLOUD_NAME: 'test_cloud',
      CLOUDINARY_API_KEY: 'test_key',
      CLOUDINARY_API_SECRET: 'test_secret',
    };
  });

  afterEach(() => {
    process.env = originalEnv;
    jest.clearAllMocks();
  });

  it('should detect when Cloudinary credentials are fully configured', () => {
    const { isCloudinaryConfigured } = require('../src/services/cloudinaryService');
    expect(isCloudinaryConfigured()).toBe(true);
  });

  it('should extract public ID correctly from full Cloudinary URLs', () => {
    const { extractPublicId } = require('../src/services/cloudinaryService');
    expect(
      extractPublicId('https://res.cloudinary.com/test_cloud/image/upload/v12345/foodtrail/sample_photo.jpg')
    ).toBe('foodtrail/sample_photo');

    expect(
      extractPublicId('https://res.cloudinary.com/test_cloud/image/upload/foodtrail/my_dish.webp')
    ).toBe('foodtrail/my_dish');

    expect(extractPublicId('foodtrail/raw_id.png')).toBe('foodtrail/raw_id');
  });

  it('should successfully stream an image buffer to Cloudinary and return secure URL', async () => {
    const cloudinary = require('cloudinary').v2;
    const mockSecureUrl = 'https://res.cloudinary.com/test_cloud/image/upload/v12345/test.png';

    cloudinary.uploader.upload_stream.mockImplementation((options, callback) => {
      const mockStream = new Writable({
        write(chunk, encoding, next) {
          next();
        },
      });
      mockStream.on('finish', () => {
        callback(null, { secure_url: mockSecureUrl });
      });
      return mockStream;
    });

    const { uploadBufferToCloudinary } = require('../src/services/cloudinaryService');
    const dummyBuffer = Buffer.from('mock image binary data');
    const result = await uploadBufferToCloudinary(dummyBuffer);

    expect(result).toBe(mockSecureUrl);
    expect(cloudinary.uploader.upload_stream).toHaveBeenCalledWith(
      expect.objectContaining({ folder: 'foodtrail', resource_type: 'image' }),
      expect.any(Function)
    );
  });

  it('should successfully delete an image from Cloudinary', async () => {
    const cloudinary = require('cloudinary').v2;
    cloudinary.uploader.destroy.mockResolvedValueOnce({ result: 'ok' });

    const { deleteImageFromCloudinary } = require('../src/services/cloudinaryService');
    const testUrl = 'https://res.cloudinary.com/test_cloud/image/upload/v12345/foodtrail/sample_photo.jpg';

    const result = await deleteImageFromCloudinary(testUrl);
    expect(result).toEqual({ result: 'ok' });
    expect(cloudinary.uploader.destroy).toHaveBeenCalledWith(
      'foodtrail/sample_photo',
      expect.objectContaining({ resource_type: 'image', invalidate: true })
    );
  });

  it('should throw descriptive error when upload to Cloudinary fails', async () => {
    const cloudinary = require('cloudinary').v2;

    cloudinary.uploader.upload_stream.mockImplementation((options, callback) => {
      const mockStream = new Writable({
        write(chunk, encoding, next) {
          next();
        },
      });
      mockStream.on('finish', () => {
        callback(new Error('Network timeout connecting to Cloudinary'), null);
      });
      return mockStream;
    });

    const { uploadBufferToCloudinary } = require('../src/services/cloudinaryService');
    const dummyBuffer = Buffer.from('mock image binary data');

    await expect(uploadBufferToCloudinary(dummyBuffer)).rejects.toThrow(
      'Cloudinary Upload Failed: Network timeout connecting to Cloudinary'
    );
  });
});
