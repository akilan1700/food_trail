// File: src/services/cloudinaryService.js
// Description: Cloudinary SDK service module for uploading, deleting, and optimizing image assets.
// Author: Akilan M
// Created: 2026-09-10T10:29:30+05:30

const cloudinary = require('cloudinary').v2;

// Initialize Cloudinary with environment variables
const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
const apiKey = process.env.CLOUDINARY_API_KEY;
const apiSecret = process.env.CLOUDINARY_API_SECRET;

const isConfigured = Boolean(cloudName && apiKey && apiSecret);

if (isConfigured) {
  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true,
  });
  console.log('Cloudinary SDK configured successfully from environment variables.');
} else {
  console.warn('Cloudinary credentials (CLOUDINARY_CLOUD_NAME/API_KEY/API_SECRET) not found.');
}

/**
 * Extracts the Cloudinary public_id from a full URL or identifier string.
 * @param {string} urlOrId - Full Cloudinary URL or public_id.
 * @returns {string} The public ID.
 */
function extractPublicId(urlOrId) {
  if (!urlOrId || typeof urlOrId !== 'string') return '';
  if (!urlOrId.includes('res.cloudinary.com')) {
    return urlOrId.replace(/\.[^/.]+$/, '');
  }
  const uploadIndex = urlOrId.indexOf('/upload/');
  if (uploadIndex === -1) return '';
  let afterUpload = urlOrId.substring(uploadIndex + 8);
  // Remove version prefix e.g. v1234567890/
  afterUpload = afterUpload.replace(/^v\d+\//, '');
  // Remove file extension
  return afterUpload.replace(/\.[^/.]+$/, '');
}

/**
 * Uploads an image buffer directly to Cloudinary with automatic optimization.
 * @param {Buffer} buffer - File buffer from Multer memoryStorage.
 * @param {string} [folder='foodtrail'] - Target folder name in Cloudinary.
 * @returns {Promise<string>} The HTTPS secure URL of the uploaded image.
 */
function uploadBufferToCloudinary(buffer, folder = 'foodtrail') {
  return new Promise((resolve, reject) => {
    if (!isConfigured) {
      return reject(
        new Error('Cloudinary is not configured. Please add CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET.')
      );
    }

    if (!buffer || !Buffer.isBuffer(buffer)) {
      return reject(new Error('Invalid image buffer provided for Cloudinary upload.'));
    }

    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: folder,
        resource_type: 'image',
        transformation: [
          { quality: 'auto', fetch_format: 'auto' },
        ],
      },
      (error, result) => {
        if (error) {
          console.error('Cloudinary stream upload failed:', error.message || error);
          return reject(new Error(`Cloudinary Upload Failed: ${error.message || 'Unknown error'}`));
        }
        resolve(result.secure_url);
      }
    );

    uploadStream.end(buffer);
  });
}

/**
 * Deletes an image from Cloudinary given its URL or public ID.
 * @param {string} urlOrId - The URL or public_id of the image to delete.
 * @returns {Promise<Object>} The deletion result from Cloudinary.
 */
async function deleteImageFromCloudinary(urlOrId) {
  if (!isConfigured) {
    throw new Error('Cloudinary is not configured. Please add CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET.');
  }

  const publicId = extractPublicId(urlOrId);
  if (!publicId) {
    throw new Error('Invalid Cloudinary public ID or URL provided.');
  }

  try {
    const result = await cloudinary.uploader.destroy(publicId, {
      resource_type: 'image',
      invalidate: true,
    });
    return result;
  } catch (error) {
    console.error('Failed to delete image from Cloudinary:', error.message || error);
    throw new Error(`Cloudinary Delete Failed: ${error.message || 'Unknown error'}`);
  }
}

/**
 * Checks if Cloudinary credentials are fully configured.
 * @returns {boolean} True if all necessary credentials exist.
 */
function isCloudinaryConfigured() {
  return isConfigured;
}

module.exports = {
  uploadBufferToCloudinary,
  deleteImageFromCloudinary,
  extractPublicId,
  isCloudinaryConfigured,
};
