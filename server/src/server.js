require('dotenv').config({ path: '.env' });
const http = require('http');
const { Server } = require('socket.io');
const { app } = require('./app');
const { initSocketServer } = require('./socket/index');
const { startCleanupSweep } = require('./rooms/cleanup');

const PORT = process.env.PORT ?? 4000;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN ?? 'http://localhost:5173';

const httpServer = http.createServer(app);

const ALLOWED_ORIGINS = [
  CLIENT_ORIGIN,
  CLIENT_ORIGIN.replace('localhost', '127.0.0.1'),
  CLIENT_ORIGIN.replace('127.0.0.1', 'localhost'),
].filter(Boolean);

const io = new Server(httpServer, {
  cors: {
    origin: ALLOWED_ORIGINS,
    credentials: true,
  },
  transports: ['websocket', 'polling'],
});

initSocketServer(io);
startCleanupSweep(io);

httpServer.listen(PORT, () => {
  console.log(`[server] Syntara server running on port ${PORT}`);
  console.log(`[server] Accepting connections from ${CLIENT_ORIGIN}`);
});
