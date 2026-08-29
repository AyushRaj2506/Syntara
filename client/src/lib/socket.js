import { io } from 'socket.io-client';

export const SERVER_URL = import.meta.env.VITE_SERVER_URL ?? 'http://localhost:4000';

/** Singleton Socket.IO client instance */
export const socket = io(SERVER_URL, {
  transports: ['websocket', 'polling'],
  reconnection: true,
  reconnectionAttempts: Infinity,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
  autoConnect: false, // connect manually on room join
});
