// File: src/routes/uploadRoutes.js
// Description: Express routing endpoints for uploading and deleting image assets organized per user.
// Author: Akilan M
// Created: 2026-08-12T14:36:00+05:30

const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const jwt = require('jsonwebtoken');
const {
  uploadBufferToCloudinary,
  deleteImageFromCloudinary,
  isCloudinaryConfigured,
} = require('../services/cloudinaryService');

const JWT_SECRET = process.env.JWT_SECRET || 'foodtrail-super-secret-key-change-in-prod';

// Multer memory storage configuration (buffer streamed directly to cloud storage)
const storage = multer.memoryStorage();

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // Limit size to 5MB
  fileFilter: (req, file, cb) => {
    const filetypes = /jpeg|jpg|png|webp/;
    const mimetype = filetypes.test(file.mimetype);
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());

    if (mimetype && extname) {
      return cb(null, true);
    }
    cb(new Error('Only image files (.jpg, .jpeg, .png, .webp) are allowed!'));
  },
});

/**
 * Resolves the destination Cloudinary folder for each user.
 * Organizes assets into foodtrail/users/<userId>/[subfolder] or foodtrail/public/[subfolder].
 * @param {Object} req - Express request object.
 * @returns {string} Target folder path.
 */
function resolveUserFolder(req) {
  let userId = null;

  // 1. Check if user is already attached to request
  if (req.user && req.user._id) {
    userId = req.user._id.toString();
  }

  // 2. Check token from cookie or Authorization header
  if (!userId) {
    let token = null;
    if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    } else if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (token) {
      try {
        const decoded = jwt.verify(token, JWT_SECRET);
        if (decoded && decoded.userId) {
          userId = decoded.userId.toString();
        }
      } catch {
        // Ignore invalid token and fallback
      }
    }
  }

  // 3. Check explicit userId from form data
  if (!userId && req.body && req.body.userId) {
    userId = String(req.body.userId).trim();
  }

  // Optional category subfolder (e.g. spots, dishes, trails)
  const subfolder = req.body && req.body.folder ? String(req.body.folder).replace(/[^a-zA-Z0-9_-]/g, '') : '';

  if (userId) {
    const cleanUserId = userId.replace(/[^a-zA-Z0-9_-]/g, '_');
    return subfolder ? `foodtrail/users/${cleanUserId}/${subfolder}` : `foodtrail/users/${cleanUserId}`;
  }

  return subfolder ? `foodtrail/public/${subfolder}` : 'foodtrail/public';
}

/**
 * @route   POST /api/upload
 * @desc    Upload an image organized into a user-specific folder structure
 * @access  Public
 */
router.post('/', upload.single('photo'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: { message: 'No photo file provided' } });
    }

    if (!isCloudinaryConfigured()) {
      return res.status(503).json({
        error: {
          message: 'Image upload service is currently unavailable. Please try again later.',
        },
      });
    }

    // Determine user-specific target folder
    const targetFolder = resolveUserFolder(req);

    const fileUrl = await uploadBufferToCloudinary(req.file.buffer, targetFolder);
    return res.status(201).json({
      success: true,
      fileId: fileUrl,
      folder: targetFolder,
      message: 'Image uploaded successfully',
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   DELETE /api/upload
 * @desc    Delete an uploaded image
 * @access  Public
 */
router.delete('/', async (req, res, next) => {
  try {
    const photoUrl = req.body?.photoUrl || req.query?.photoUrl || req.body?.fileId;
    if (!photoUrl) {
      return res.status(400).json({ error: { message: 'photoUrl or fileId is required for deletion' } });
    }

    if (!isCloudinaryConfigured()) {
      return res.status(503).json({
        error: {
          message: 'Image removal service is currently unavailable. Please try again later.',
        },
      });
    }

    const result = await deleteImageFromCloudinary(photoUrl);
    return res.status(200).json({
      success: true,
      message: 'Image removed successfully',
      result,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/upload/status
 * @desc    Check if image upload credentials are configured
 * @access  Public
 */
router.get('/status', (req, res) => {
  res.json({
    configured: isCloudinaryConfigured(),
  });
});

module.exports = router;
