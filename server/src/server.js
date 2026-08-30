require('dotenv').config({ path: '.env' });
const http = require('http');
const { Server } = require('socket.io');
const { app } = require('./app');
const { initSocketServer } = require('./socket/index');
const { startCleanupSweep } = require('./rooms/cleanup');

const PORT = process.env.PORT ?? 4000;
const rawOrigins = process.env.CLIENT_ORIGIN ?? 'http://localhost:5173';
const CLIENT_ORIGINS = rawOrigins.split(',').map((s) => s.trim()).filter(Boolean);

const httpServer = http.createServer(app);

const ALLOWED_ORIGINS = Array.from(new Set([
  ...CLIENT_ORIGINS,
  ...CLIENT_ORIGINS.flatMap((o) => [
    o.replace('localhost', '127.0.0.1'),
    o.replace('127.0.0.1', 'localhost'),
  ]),
]));

const io = new Server(httpServer, {
  cors: {
    origin: (origin, cb) => {
      if (!origin || ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
      return cb(new Error(`Socket CORS blocked: ${origin}`));
    },
    credentials: true,
  },
  transports: ['websocket', 'polling'],
});

initSocketServer(io);
startCleanupSweep(io);

httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`[server] Syntara server running on port ${PORT}`);
  console.log(`[server] Accepting connections from ${ALLOWED_ORIGINS.join(', ')}`);
});
