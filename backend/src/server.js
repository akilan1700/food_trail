// File: src/server.js
// Description: Entry point for starting the Express server and connecting to MongoDB.
// Author: Akilan M
// Updated: 2026-09-11

require('dotenv').config();
const app = require('./app');
const connectDB = require('./config/db');

const PORT = process.env.PORT || 5001;

// Connect database and run server (create admins manually in MongoDB — no auto-seed)
connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`FoodTrail backend server running on port ${PORT}`);
  });
}).catch((error) => {
  console.error('Failed to start server due to DB connection error:', error);
  process.exit(1);
});
