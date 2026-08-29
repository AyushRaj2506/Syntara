const { roomStore } = require('../../rooms/RoomStore');

/** Minimum interval between code:update events per socket (server-enforced) */
const MIN_UPDATE_INTERVAL_MS = 250;
const lastUpdateMap = new Map();

/**
 * @param {import('socket.io').Server} io
 * @param {import('socket.io').Socket} socket
 */
function registerCodeHandlers(io, socket) {
  socket.on('code:update', (payload) => {
    const { roomId, participantId } = socket.data ?? {};
    if (!roomId || !participantId) return;

    const now = Date.now();
    const last = lastUpdateMap.get(socket.id) ?? 0;
    if (now - last < MIN_UPDATE_INTERVAL_MS) return;
    lastUpdateMap.set(socket.id, now);

    const room = roomStore.getById(roomId);
    if (!room) return;

    const { code = '', language = 'python' } = payload || {};
    if (typeof code !== 'string' || code.length > 200000) return;

    room.codeState = {
      code,
      language: ['python', 'cpp'].includes(language) ? language : 'python',
      lastEditedBy: participantId,
      updatedAt: now,
    };

    // Broadcast to everyone else
    socket.to(roomId).emit('code:update', room.codeState);
  });

  socket.on('code:clear', () => {
    const { roomId } = socket.data ?? {};
    if (!roomId) return;
    const room = roomStore.getById(roomId);
    if (!room) return;
    room.codeState = { code: '', language: room.codeState?.language || 'python', updatedAt: Date.now() };
    io.to(roomId).emit('code:clear');
  });

  socket.on('disconnect', () => {
    lastUpdateMap.delete(socket.id);
  });
}

module.exports = { registerCodeHandlers };
