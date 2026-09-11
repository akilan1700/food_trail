// File: src/routes/uploadRoutes.js
// Description: Authenticated image upload/delete endpoints organized per user or admin folder.
// Author: Akilan M
// Updated: 2026-09-11

const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const {
  uploadBufferToCloudinary,
  deleteImageFromCloudinary,
  isCloudinaryConfigured,
} = require('../services/cloudinaryService');
const authOrAdminMiddleware = require('../middleware/authOrAdminMiddleware');

const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
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
 * Resolves Cloudinary folder from authenticated identity only (no body userId spoofing).
 * @param {import('express').Request} req
 * @returns {string}
 */
function resolveUserFolder(req) {
  let ownerId = null;
  let prefix = 'users';

  if (req.admin && req.admin._id) {
    ownerId = req.admin._id.toString();
    prefix = 'admins';
  } else if (req.user && req.user._id) {
    ownerId = req.user._id.toString();
    prefix = 'users';
  }

  const subfolder =
    req.body && req.body.folder ? String(req.body.folder).replace(/[^a-zA-Z0-9_-]/g, '') : '';

  if (!ownerId) {
    return subfolder ? `foodtrail/public/${subfolder}` : 'foodtrail/public';
  }

  const cleanId = ownerId.replace(/[^a-zA-Z0-9_-]/g, '_');
  return subfolder
    ? `foodtrail/${prefix}/${cleanId}/${subfolder}`
    : `foodtrail/${prefix}/${cleanId}`;
}

/**
 * @route   POST /api/upload
 * @desc    Upload an image (user or admin auth required)
 * @access  Private
 */
router.post('/', authOrAdminMiddleware, upload.single('photo'), async (req, res, next) => {
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
 * @desc    Delete an uploaded image (auth required)
 * @access  Private
 */
router.delete('/', authOrAdminMiddleware, async (req, res, next) => {
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
