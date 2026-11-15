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
 * @param {import('socket.io').Server} io
 * @param {import('socket.io').Socket} socket
 */
function registerChatHandlers(io, socket) {
  socket.on('chat:send', (payload, callback) => {
    const ack = typeof callback === 'function' ? callback : () => {};
    const { roomId, participantId } = socket.data ?? {};
    if (!roomId || !participantId) return ack({ error: { message: 'You are not in a room.' } });

    if (isRateLimited(socket.id)) {
      ack({ error: { code: 'RATE_LIMITED', message: 'Slow down — too many messages.' } });
      return;
    }

    const result = chatSendSchema.safeParse(payload);
    if (!result.success) return ack({ error: { message: 'Invalid message.' } });

    const room = roomStore.getById(roomId);
    if (!room || room.expiresAt <= Date.now()) return ack({ error: { message: 'Room has ended.' } });

    const participant = room.participants[participantId];
    if (!participant) return ack({ error: { message: 'Join the room again.' } });
    const duplicate = room.messages.find(m => m.id === result.data.id);
    if (duplicate) return duplicate.participantId === participantId ? ack({ message: duplicate }) : ack({ error: { message: 'Message ID already used.' } });
    if (result.data.file && !room.files.some(f => f.url === result.data.file.url)) return ack({ error: { message: 'File is not available in this room.' } });

    /** @type {import('../../types/index.js').ChatMessage} */
    const message = {
      id: result.data.id || uuidv4(),
      type: 'user',
      participantId,
      displayName: participant.displayName,
      text: result.data.text ? result.data.text : '',
      file: result.data.file ? room.files.find(f => f.url === result.data.file.url) : undefined,
      createdAt: Date.now(),
    };

    room.messages.push(message);
    if (room.messages.length > 500) room.messages.shift();

    io.to(roomId).emit('chat:message', { message });
    ack({ message });
  });

  socket.on('chat:typing', (payload) => {
    const { roomId, participantId } = socket.data ?? {};
    if (!roomId || !participantId) return;
    const room = roomStore.getById(roomId);
    if (!room) return;
    const participant = room.participants[participantId];
    if (!participant) return;

    socket.to(roomId).emit('chat:typing', {
      participantId,
      displayName: participant.displayName,
      isTyping: !!payload?.isTyping,
    });
  });

  // Clean up rate limiter on disconnect
  socket.on('disconnect', () => {
    rateLimitMap.delete(socket.id);
  });
}

module.exports = { registerChatHandlers };
