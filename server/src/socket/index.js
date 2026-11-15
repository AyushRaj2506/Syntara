const { roomStore } = require('../rooms/RoomStore');
const { registerRoomHandlers } = require('./handlers/room');
const { registerChatHandlers } = require('./handlers/chat');
const { registerNotesHandlers } = require('./handlers/notes');
const { registerWhiteboardHandlers } = require('./handlers/whiteboard');
const { registerFocusHandlers } = require('./handlers/focus');
const { registerGoalsHandlers } = require('./handlers/goals');
const { registerQuizHandlers } = require('./handlers/quiz');
const { registerCodeHandlers } = require('./handlers/code');
const { registerWebRTCHandlers } = require('./handlers/webrtc');


const { rateLimit } = require('../services/rateLimit');
const isIpRateLimited = rateLimit(Number(process.env.MAX_ROOMS_PER_IP_PER_HOUR || 10), 3600000);
const eventLimited = rateLimit(300, 1000);

/**
 * Initialize the Socket.IO server and register all handlers.
 * @param {import('socket.io').Server} io
 */
function initSocketServer(io) {
  io.on('connection', (socket) => {
    const ip = socket.handshake.address;
    console.log(`[socket] Connected: ${socket.id} from ${ip}`);

    // IP-level rate limit on room creation (checked inside room handler but gate early)
    socket.use(([event, ...args], next) => {
      const room = roomStore.getById(socket.data.roomId);
      if (room && room.expiresAt <= Date.now() && !['room:create', 'room:join', 'room:leave'].includes(event)) {
        const ack = args[args.length - 1];
        if (typeof ack === 'function') ack({ error: { message: 'Room has ended.' } });
        socket.emit('room:closed', { reason: 'expired' });
        return;
      }
      if (eventLimited(socket.id)) {
        const ack = args[args.length - 1];
        if (typeof ack === 'function') ack({ error: { code: 'RATE_LIMITED', message: 'Too many requests.' } });
        return;
      }
      if (event === 'room:create' && isIpRateLimited(ip)) {
        const ack = args[args.length - 1];
        if (typeof ack === 'function') {
          ack({ error: { code: 'RATE_LIMITED', message: 'Too many rooms created. Try again later.' } });
        }
        return;
      }
      next();
    });

    // On join, send full room state sync
    socket.on('room:join', () => {
      // State sync is handled inside room handler after successful join
    });

    require('./handlers/collaboration').registerCollaboration(io, socket);
    registerRoomHandlers(io, socket);
    registerChatHandlers(io, socket);
    registerNotesHandlers(io, socket);
    registerWhiteboardHandlers(io, socket);
    registerFocusHandlers(io, socket);
    registerGoalsHandlers(io, socket);
    registerQuizHandlers(io, socket);
    registerCodeHandlers(io, socket);
    registerWebRTCHandlers(io, socket);

    socket.on('disconnect', (reason) => {

      console.log(`[socket] Disconnected: ${socket.id} — ${reason}`);
    });
  });
}

module.exports = { initSocketServer };
