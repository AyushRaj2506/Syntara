const { roomStore } = require('../../rooms/RoomStore');
const { rateLimit } = require('../../services/rateLimit');
const limited = rateLimit(30, 10000);
function registerDocument(io, socket, kind, normalize) {
  socket.on(`${kind}:update`, (payload, callback) => {
    const ack = typeof callback === 'function' ? callback : () => {};
    const { roomId, participantId } = socket.data;
    const room = roomStore.getById(roomId);
    if (!room?.participants[participantId] || room.expiresAt <= Date.now()) return ack({ error: 'Room unavailable.' });
    const current = kind === 'notes' ? { content: room.sharedNotes, revision: room.notesRevision || 0 } : room.codeState;
    if (payload?.revision !== (current.revision || 0)) return ack({ error: 'CONFLICT', state: current });
    if (limited(`${socket.id}:${kind}`)) return ack({ error: 'Too many changes. Retry shortly.' });
    const value = normalize(payload);
    if (!value) return ack({ error: 'Invalid or oversized document.' });
    const state = { ...value, revision: (current.revision || 0) + 1 };
    if (kind === 'notes') { room.sharedNotes = state.content; room.notesRevision = state.revision; }
    else room.codeState = state;
    socket.to(roomId).emit(`${kind}:update`, state);
    ack({ state });
  });
}
module.exports = { registerDocument };
