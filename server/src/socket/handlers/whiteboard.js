const { roomStore } = require('../../rooms/RoomStore');
const { whiteboardDrawSchema } = require('../../services/validation');

/** Throttle: max 1 whiteboard:draw event per 35ms per socket */
const MIN_DRAW_INTERVAL_MS = 35;
const lastDrawMap = new Map(); // socketId → timestamp

/**
 * @param {import('socket.io').Server} io
 * @param {import('socket.io').Socket} socket
 */
function registerWhiteboardHandlers(io, socket) {
  socket.on('whiteboard:draw', (payload) => {
    const { roomId, participantId } = socket.data ?? {};
    if (!roomId || !participantId) return;

    // Server-side throttle
    const now = Date.now();
    const last = lastDrawMap.get(socket.id) ?? 0;
    if (now - last < MIN_DRAW_INTERVAL_MS) return;
    lastDrawMap.set(socket.id, now);

    const result = whiteboardDrawSchema.safeParse(payload);
    if (!result.success) return;

    const room = roomStore.getById(roomId);
    if (!room) return;

    const { strokeId, points, color, size, done } = result.data;

    // Relay to others for live progressive rendering
    socket.to(roomId).emit('whiteboard:draw', { strokeId, points, color, size, done, participantId });

    // Only persist completed strokes to whiteboardState
    if (done) {
      // Merge points if stroke already partially stored (in case of multi-emit)
      const existing = room.whiteboardState.find((s) => s.strokeId === strokeId);
      if (existing) {
        existing.points = points; // final authoritative set
      } else {
        room.whiteboardState.push({ strokeId, participantId, color, size, points });
      }
    }
  });

  socket.on('whiteboard:clear', () => {
    const { roomId } = socket.data ?? {};
    if (!roomId) return;
    const room = roomStore.getById(roomId);
    if (!room) return;
    room.whiteboardState = [];
    // Broadcast to all participants in room
    io.to(roomId).emit('whiteboard:clear');
  });

  socket.on('whiteboard:undo', (payload) => {
    const { roomId } = socket.data ?? {};
    if (!roomId) return;
    const room = roomStore.getById(roomId);
    if (!room) return;
    const { strokeId } = payload || {};
    if (strokeId) {
      room.whiteboardState = room.whiteboardState.filter((s) => s.strokeId !== strokeId);
    } else {
      room.whiteboardState.pop();
    }
    io.to(roomId).emit('whiteboard:undo', { strokeId });
  });

  socket.on('disconnect', () => {
    lastDrawMap.delete(socket.id);
  });
}

module.exports = { registerWhiteboardHandlers };
