const { v4: uuidv4 } = require('uuid');
const { roomStore } = require('../../rooms/RoomStore');
const { chatSendSchema } = require('../../services/validation');

/** Rate limiting: max 5 messages per 10 seconds per socket */
const rateLimitMap = new Map(); // socketId → { count, windowStart }

function isRateLimited(socketId) {
  const now = Date.now();
  const entry = rateLimitMap.get(socketId) ?? { count: 0, windowStart: now };
  if (now - entry.windowStart > 10000) {
    entry.count = 0;
    entry.windowStart = now;
  }
  entry.count++;
  rateLimitMap.set(socketId, entry);
  return entry.count > 5;
}

/**
 * HTML-escape a string to prevent XSS when rendering as text.
 * @param {string} str
 * @returns {string}
 */
function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * @param {import('socket.io').Server} io
 * @param {import('socket.io').Socket} socket
 */
function registerChatHandlers(io, socket) {
  socket.on('chat:send', (payload) => {
    const { roomId, participantId } = socket.data ?? {};
    if (!roomId || !participantId) return;

    if (isRateLimited(socket.id)) {
      socket.emit('error', { code: 'RATE_LIMITED', message: 'Slow down — too many messages.' });
      return;
    }

    const result = chatSendSchema.safeParse(payload);
    if (!result.success) return;

    const room = roomStore.getById(roomId);
    if (!room) return;

    const participant = room.participants[participantId];
    if (!participant) return;

    /** @type {import('../../types/index.js').ChatMessage} */
    const message = {
      id: uuidv4(),
      type: 'user',
      participantId,
      displayName: participant.displayName,
      text: result.data.text ? escapeHtml(result.data.text) : '',
      file: result.data.file ? {
        fileId: result.data.file.fileId,
        fileName: escapeHtml(result.data.file.fileName),
        fileSize: result.data.file.fileSize,
        fileType: result.data.file.fileType,
        url: result.data.file.url,
      } : undefined,
      createdAt: Date.now(),
    };

    room.messages.push(message);
    if (room.messages.length > 500) room.messages.shift();

    io.to(roomId).emit('chat:message', { message });
  });

  // Clean up rate limiter on disconnect
  socket.on('disconnect', () => {
    rateLimitMap.delete(socket.id);
  });
}

module.exports = { registerChatHandlers };
