// File: src/services/adminSeedService.js
// Description: Service for reading adminCredentials.json and automatically seeding administrator accounts into the Admin collection.
// Author: Akilan M
// Created: 2026-09-10T11:25:35+05:30

const path = require('path');
const fs = require('fs');
const Admin = require('../models/Admin');

/**
 * Reads admin credentials from the JSON config file and ensures all listed administrators exist in MongoDB.
 * Updates names or roles if modified in the JSON file.
 *
 * @returns {Promise<number>} Count of administrators seeded or verified.
 */
async function seedAdminsFromConfig() {
  try {
    const configPath = path.join(__dirname, '../config/adminCredentials.json');
    if (!fs.existsSync(configPath)) {
      console.warn('adminCredentials.json not found at:', configPath);
      return 0;
    }

    const rawData = fs.readFileSync(configPath, 'utf-8');
    const adminList = JSON.parse(rawData);

    if (!Array.isArray(adminList) || adminList.length === 0) {
      console.log('No admin credentials defined in adminCredentials.json');
      return 0;
    }

    let seededCount = 0;

    for (const item of adminList) {
      if (!item.email || !item.mpin) {
        console.warn('Skipping invalid admin credential item (missing email or mpin):', item);
        continue;
      }

      const trimmedEmail = item.email.trim().toLowerCase();
      const existingAdmin = await Admin.findOne({ email: trimmedEmail });

      if (!existingAdmin) {
        const newAdmin = new Admin({
          email: trimmedEmail,
          name: item.name ? item.name.trim() : 'Administrator',
          mpin: String(item.mpin).trim(),
          role: item.role === 'superadmin' ? 'superadmin' : 'admin',
        });
        await newAdmin.save();
        console.log(`Seeded new Admin account: ${trimmedEmail}`);
        seededCount++;
      } else {
        let updated = false;
        if (item.name && existingAdmin.name !== item.name.trim()) {
          existingAdmin.name = item.name.trim();
          updated = true;
        }
        if (item.role && existingAdmin.role !== item.role) {
          existingAdmin.role = item.role;
          updated = true;
        }
        // Verify if MPIN needs update
        if (!existingAdmin.compareMpin(item.mpin)) {
          existingAdmin.mpin = String(item.mpin).trim();
          updated = true;
        }
        if (updated) {
          await existingAdmin.save();
          console.log(`Updated Admin credentials for: ${trimmedEmail}`);
        }
        seededCount++;
      }
    }

    console.log(`Admin seeding complete. Total verified/seeded admins: ${seededCount}`);
    return seededCount;
  } catch (error) {
    console.error('Error during admin credentials seeding:', error);
    return 0;
  }
}

module.exports = {
  seedAdminsFromConfig,
};
