const { roomStore } = require('./RoomStore');
const { deleteRoomUploads } = require('./roomUtils');

const CLEANUP_INTERVAL_MS = parseInt(process.env.ROOM_CLEANUP_INTERVAL_MS ?? '60000', 10);

/**
 * Start the periodic sweep that removes expired rooms.
 *
 * Empty-room cleanup is handled event-driven in room.js handleLeave() —
 * when the final participant leaves, the room is immediately deleted.
 * This sweep only handles rooms that outlive their expiresAt timer.
 *
 * @param {import('socket.io').Server} io
 */
function startCleanupSweep(io) {
  setInterval(() => {
    const now = Date.now();
    for (const room of roomStore.all()) {
      if (now >= room.expiresAt) {
        io.to(room.roomId).emit('room:closed', { reason: 'expired' });
        io.in(room.roomId).socketsLeave(room.roomId);
        deleteRoomUploads(room.roomId);
        roomStore.delete(room.roomId);
        console.log(`[cleanup] Room ${room.roomCode} expired and removed.`);
      }
    }
  }, CLEANUP_INTERVAL_MS);
}

module.exports = { startCleanupSweep };
