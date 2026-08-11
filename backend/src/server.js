// File: src/server.js
// Description: Entry point for starting the Express server and connecting to MongoDB.
// Author: Akilan M
// Created: 2026-08-11T17:38:05+05:30

require('dotenv').config();
const app = require('./app');
const connectDB = require('./config/db');

const PORT = process.env.PORT || 5001;

// Connect database and run server
connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`FoodTrail backend server running on port ${PORT}`);
  });
}).catch((error) => {
  console.error('Failed to start server due to DB connection error:', error);
  process.exit(1);
});
