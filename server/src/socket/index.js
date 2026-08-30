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


/** @type {Map<string, number>} IP → room creation count in current window */
const ipRoomCreationMap = new Map();
const RATE_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const MAX_ROOMS_PER_IP = parseInt(process.env.MAX_ROOMS_PER_IP_PER_HOUR ?? '10', 10);

/**
 * @param {string} ip
 * @returns {boolean}
 */
function isIpRateLimited(ip) {
  const now = Date.now();
  const entry = ipRoomCreationMap.get(ip) ?? { count: 0, windowStart: now };
  if (now - entry.windowStart > RATE_WINDOW_MS) {
    entry.count = 0;
    entry.windowStart = now;
  }
  entry.count++;
  ipRoomCreationMap.set(ip, entry);
  return entry.count > MAX_ROOMS_PER_IP;
}

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
