// File: src/services/adminSeedService.js
// Description: Seeds administrator accounts from env (preferred) or non-secret config placeholders.
// Author: Akilan M
// Updated: 2026-09-11

const path = require('path');
const fs = require('fs');
const Admin = require('../models/Admin');

/**
 * Returns true if the MPIN value looks like a real seed secret (not a placeholder).
 * @param {string} mpin
 * @returns {boolean}
 */
function isUsableMpin(mpin) {
  if (!mpin || typeof mpin !== 'string') return false;
  const trimmed = mpin.trim();
  if (!trimmed || trimmed.includes('REPLACE') || trimmed.includes('PLACEHOLDER')) return false;
  return /^\d{4}$|^\d{6}$/.test(trimmed);
}

/**
 * Reads admin credentials and ensures administrators exist in MongoDB.
 * Prefers ADMIN_EMAIL + ADMIN_MPIN environment variables.
 * @returns {Promise<number>} Count of administrators seeded or verified.
 */
async function seedAdminsFromConfig() {
  try {
    const configPath = path.join(__dirname, '../config/adminCredentials.json');
    let adminList = [];
    if (fs.existsSync(configPath)) {
      const rawData = fs.readFileSync(configPath, 'utf-8');
      const parsed = JSON.parse(rawData);
      adminList = Array.isArray(parsed) ? parsed : [];
    }

    if (process.env.ADMIN_EMAIL && process.env.ADMIN_MPIN) {
      adminList.push({
        email: process.env.ADMIN_EMAIL,
        name: process.env.ADMIN_NAME || 'FoodTrail Administrator',
        mpin: process.env.ADMIN_MPIN,
        role: 'superadmin',
      });
    }

    adminList = adminList.filter((item) => item && item.email && isUsableMpin(String(item.mpin || '')));

    if (adminList.length === 0) {
      console.log('No admin credentials defined via ADMIN_EMAIL/ADMIN_MPIN (config placeholders skipped).');
      return 0;
    }

    let seededCount = 0;

    for (const item of adminList) {
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
          existingAdmin.role = item.role === 'superadmin' ? 'superadmin' : 'admin';
          updated = true;
        }
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
