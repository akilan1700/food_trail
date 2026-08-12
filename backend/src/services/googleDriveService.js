// File: src/services/googleDriveService.js
// Description: Service helper for uploading files to Google Drive using the Drive v3 API.
// Author: Akilan M
// Created: 2026-08-12T14:35:00+05:30

const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

let driveClient = null;

// Initialize Drive API Client from Environment Variables
try {
  const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;
  const privateKey = process.env.GOOGLE_PRIVATE_KEY;
  const projectId = process.env.GOOGLE_PROJECT_ID;

  if (clientEmail && privateKey) {
    const formattedPrivateKey = privateKey.replace(/\\n/g, '\n');
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: clientEmail,
        private_key: formattedPrivateKey,
      },
      projectId: projectId,
      scopes: ['https://www.googleapis.com/auth/drive'],
    });
    driveClient = google.drive({ version: 'v3', auth });
    console.log('Google Drive API client initialized successfully from environment variables.');
  } else {
    console.warn('Google Drive credentials (GOOGLE_CLIENT_EMAIL/GOOGLE_PRIVATE_KEY) were not found in environment variables. Drive uploads will be unavailable.');
  }
} catch (error) {
  console.error('Error initializing Google Drive API client:', error.message);
}

/**
 * Uploads a file buffer stream to a specified Google Drive folder and sets public read permission.
 * @param {Object} file - Multer file object.
 * @returns {Promise<string>} The Google Drive File ID.
 */
async function uploadFileToDrive(file) {
  if (!driveClient) {
    throw new Error('Google Drive integration is not configured. Please add GOOGLE_CLIENT_EMAIL and GOOGLE_PRIVATE_KEY environment variables.');
  }

  const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID;
  const fileMetadata = {
    name: `${Date.now()}-${file.originalname}`,
  };

  if (folderId) {
    fileMetadata.parents = [folderId];
  }

  const media = {
    mimeType: file.mimetype,
    body: fs.createReadStream(file.path),
  };

  try {
    // 1. Create file on Drive
    const uploadRes = await driveClient.files.create({
      requestBody: fileMetadata,
      media: media,
      fields: 'id',
    });

    const fileId = uploadRes.data.id;

    // 2. Set read permission to public
    await driveClient.permissions.create({
      fileId: fileId,
      requestBody: {
        role: 'reader',
        type: 'anyone',
      },
    });

    // 3. Remove local temporary file
    fs.unlink(file.path, (err) => {
      if (err) console.error('Failed to delete temporary local upload file:', err);
    });

    return fileId;
  } catch (error) {
    // Clean up local temp file on error too
    if (fs.existsSync(file.path)) {
      fs.unlinkSync(file.path);
    }
    console.error('Error uploading file to Google Drive:', error);
    throw new Error(`Google Drive Upload Failed: ${error.message}`);
  }
}

module.exports = {
  uploadFileToDrive,
  isDriveConfigured: () => !!driveClient,
};
