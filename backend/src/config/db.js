// File: src/config/db.js
// Description: MongoDB database connection configuration using Mongoose.
// Author: Akilan M
// Updated: 2026-09-11

const mongoose = require('mongoose');

/**
 * Connects to the MongoDB database.
 * Uses the MONGO_URI environment variable or defaults to a local instance.
 * @returns {Promise<void>} Resolves when connection is successful.
 */
async function connectDB() {
  const uri = process.env.MONGO_URI || 'mongodb://localhost:27017/foodtrail';
  try {
    await mongoose.connect(uri);
    console.log('MongoDB connected successfully');
  } catch (error) {
    console.error('Error connecting to MongoDB:', error.message);
    process.exit(1);
  }
}

module.exports = connectDB;
