// File: src/routes/uploadRoutes.js
// Description: Express routing endpoints for uploading files and checking Drive configurations.
// Author: Akilan M
// Created: 2026-08-12T14:36:00+05:30

const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { uploadFileToDrive, isDriveConfigured } = require('../services/googleDriveService');

// Make sure temp upload dir exists inside workspace
const uploadDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer storage configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  },
});

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
    cb(new Error('Only images (.jpg, .jpeg, .png, .webp) are allowed!'));
  },
});

/**
 * @route   POST /api/upload
 * @desc    Upload an image to Google Drive and return the generated File ID
 * @access  Public
 */
router.post('/', upload.single('photo'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: { message: 'No photo file provided' } });
    }

    if (isDriveConfigured()) {
      const fileId = await uploadFileToDrive(req.file);
      res.status(201).json({
        success: true,
        fileId,
      });
    } else {
      // Local fallback: return the relative URL path of the uploaded file
      const fileId = `/uploads/${req.file.filename}`;
      res.status(201).json({
        success: true,
        fileId,
      });
    }
  } catch (error) {
    next(error);
  }
});

/**
 * @route   GET /api/upload/status
 * @desc    Check if Google Drive credentials are configured
 * @access  Public
 */
router.get('/status', (req, res) => {
  res.json({
    configured: isDriveConfigured(),
  });
});

module.exports = router;
