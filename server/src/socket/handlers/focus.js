const { roomStore } = require('../../rooms/RoomStore');
const { focusStartSchema } = require('../../services/validation');

/** @type {Map<string, NodeJS.Timeout>} roomId → timeout handle for auto-completion */
const focusTimers = new Map();

/**
 * @param {import('socket.io').Server} io
 * @param {import('socket.io').Socket} socket
 */
function registerFocusHandlers(io, socket) {
  socket.on('focus:start', (payload) => {
    const { roomId, participantId } = socket.data ?? {};
    if (!roomId || !participantId) return;

    const room = roomStore.getById(roomId);
    if (!room) return;

    // Host-only
    if (room.hostId !== participantId) {
      socket.emit('error', { code: 'UNAUTHORIZED', message: 'Only the host can start a focus session.' });
      return;
    }

    const result = focusStartSchema.safeParse(payload);
    if (!result.success) return;

    const { durationMin, breakMin } = result.data;
    const now = Date.now();
    const endsAt = now + durationMin * 60 * 1000;
    const connectedCount = roomStore.connectedCount(roomId);

    room.focusSession = {
      status: 'FOCUSING',
      durationMin,
      breakMin,
      startedAt: now,
      endsAt,
      participantsAtStart: connectedCount,
      startedBy: participantId,
    };

    io.to(roomId).emit('focus:start', { focusSession: room.focusSession });

    // Auto-complete when timer ends
    const existing = focusTimers.get(roomId);
    if (existing) clearTimeout(existing);

    const handle = setTimeout(() => {
      completeFocusSession(io, roomId);
    }, durationMin * 60 * 1000);
    handle.unref?.();
    focusTimers.set(roomId, handle);
  });

  socket.on('focus:pause', () => {
    const { roomId, participantId } = socket.data ?? {};
    if (!roomId || !participantId) return;
    const room = roomStore.getById(roomId);
    if (!room || room.hostId !== participantId) return;
    if (!room.focusSession || room.focusSession.status !== 'FOCUSING') return;

    // Store remaining time
    const remaining = Math.max(0, room.focusSession.endsAt - Date.now());
    room.focusSession.endsAt = undefined;
    room.focusSession.status = 'PAUSED';
    room.focusSession._pausedRemaining = remaining;

    const handle = focusTimers.get(roomId);
    if (handle) { clearTimeout(handle); focusTimers.delete(roomId); }

    io.to(roomId).emit('focus:pause', { focusSession: room.focusSession });
  });

  socket.on('focus:resume', () => {
    const { roomId, participantId } = socket.data ?? {};
    if (!roomId || !participantId) return;
    const room = roomStore.getById(roomId);
    if (!room || room.hostId !== participantId) return;
    if (room.focusSession?.status !== 'PAUSED') return;

    const remaining = room.focusSession._pausedRemaining ?? room.focusSession.durationMin * 60 * 1000;
    const endsAt = Date.now() + remaining;
    room.focusSession.status = 'FOCUSING';
    room.focusSession.endsAt = endsAt;
    delete room.focusSession._pausedRemaining;

    io.to(roomId).emit('focus:resume', { focusSession: room.focusSession });

    const handle = setTimeout(() => completeFocusSession(io, roomId), remaining);
    handle.unref?.();
    focusTimers.set(roomId, handle);
  });

  socket.on('focus:end', () => {
    const { roomId, participantId } = socket.data ?? {};
    if (!roomId || !participantId) return;
    const room = roomStore.getById(roomId);
    if (!room || room.hostId !== participantId) return;

    const handle = focusTimers.get(roomId);
    if (handle) { clearTimeout(handle); focusTimers.delete(roomId); }

    if (room.focusSession?.status === 'COMPLETED') {
      room.focusSession = null;
      io.to(roomId).emit('focus:end', { focusSession: null });
    } else completeFocusSession(io, roomId);
  });
}

/**
 * Transition focus session to COMPLETED state and broadcast.
 * @param {import('socket.io').Server} io
 * @param {string} roomId
 */
function completeFocusSession(io, roomId) {
  const room = roomStore.getById(roomId);
  if (!room || !room.focusSession) return;

  const session = room.focusSession;
  const remaining = session._pausedRemaining ?? Math.max(0, session.endsAt - Date.now());
  session.elapsedSeconds = Math.max(0, Math.floor((session.durationMin * 60000 - remaining) / 1000));
  delete session._pausedRemaining;
  room.focusSession.status = 'COMPLETED';
  room.focusSession.endsAt = undefined;
  focusTimers.delete(roomId);

  io.to(roomId).emit('focus:end', { focusSession: room.focusSession });


}

function clearFocusTimer(roomId) {
  clearTimeout(focusTimers.get(roomId));
  focusTimers.delete(roomId);
}
module.exports = { registerFocusHandlers, clearFocusTimer };
