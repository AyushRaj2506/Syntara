const path = require('path');
const fs = require('fs');
const { roomStore } = require('./RoomStore');

const CLEANUP_INTERVAL_MS = parseInt(process.env.ROOM_CLEANUP_INTERVAL_MS ?? '60000', 10);
const EMPTY_GRACE_MS = parseInt(process.env.ROOM_EMPTY_GRACE_MS ?? '120000', 10);

/** @type {Map<string, number>} roomId → timestamp when it became empty */
const emptyRoomTimestamps = new Map();

function deleteRoomUploads(roomId) {
  try {
    const roomDir = path.join(__dirname, '..', '..', 'uploads', 'temp', roomId);
    if (fs.existsSync(roomDir)) {
      fs.rmSync(roomDir, { recursive: true, force: true });
    }
  } catch (err) {
    console.error(`[cleanup] Error removing uploads for room ${roomId}:`, err.message);
  }
}

/**
 * Start the periodic sweep that removes expired or long-empty rooms.
 * @param {import('socket.io').Server} io
 */
function startCleanupSweep(io) {
  setInterval(() => {
    const now = Date.now();
    for (const room of roomStore.all()) {
      // Expired
      if (now >= room.expiresAt) {
        io.to(room.roomId).emit('room:closed', { reason: 'expired' });
        io.in(room.roomId).socketsLeave(room.roomId);
        deleteRoomUploads(room.roomId);
        roomStore.delete(room.roomId);
        emptyRoomTimestamps.delete(room.roomId);
        console.log(`[cleanup] Room ${room.roomCode} expired.`);
        continue;
      }

      // Empty check: participants are fully removed on leave, so use participantCount
      const remaining = roomStore.participantCount(room.roomId);
      if (remaining === 0) {
        if (!emptyRoomTimestamps.has(room.roomId)) {
          emptyRoomTimestamps.set(room.roomId, now);
        } else if (now - emptyRoomTimestamps.get(room.roomId) >= EMPTY_GRACE_MS) {
          io.to(room.roomId).emit('room:closed', { reason: 'empty' });
          io.in(room.roomId).socketsLeave(room.roomId);
          deleteRoomUploads(room.roomId);
          roomStore.delete(room.roomId);
          emptyRoomTimestamps.delete(room.roomId);
          console.log(`[cleanup] Room ${room.roomCode} removed (empty too long).`);
        }
      } else {
        emptyRoomTimestamps.delete(room.roomId);
      }
    }
  }, CLEANUP_INTERVAL_MS);
}

module.exports = { startCleanupSweep };
