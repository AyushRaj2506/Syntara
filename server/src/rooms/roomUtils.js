const path = require('path');
const fs = require('fs');

const UPLOAD_DIR = path.join(__dirname, '..', '..', 'uploads', 'temp');

/**
 * Synchronously deletes the upload directory for a given room.
 * Safe to call even if the directory does not exist.
 * @param {string} roomId
 */
function deleteRoomUploads(roomId) {
  try {
    const roomDir = path.join(UPLOAD_DIR, roomId);
    if (fs.existsSync(roomDir)) {
      fs.rmSync(roomDir, { recursive: true, force: true });
    }
  } catch (err) {
    console.error(`[cleanup] Error removing uploads for room ${roomId}:`, err.message);
  }
}

module.exports = { deleteRoomUploads, UPLOAD_DIR };
