const Y = require('yjs');
const { roomStore } = require('../../rooms/RoomStore');
const documents = new WeakMap();
function getDocument(room, kind) {
  if (!documents.has(room)) documents.set(room, new Map());
  const map = documents.get(room);
  if (!map.has(kind)) map.set(kind, new Y.Doc());
  return map.get(kind);
}
function registerCollaboration(io, socket) {
  socket.on('document:sync', (payload, callback) => {
    const { kind, update, stateVector } = payload || {};
    const ack = typeof callback === 'function' ? callback : () => {};
    const room = roomStore.getById(socket.data.roomId);
    if (!room?.participants[socket.data.participantId] || room.expiresAt <= Date.now()) return ack({ error: 'Join the room to sync.' });
    if (!['notes', 'code'].includes(kind) || typeof update !== 'string' || update.length > 900000) return ack({ error: 'Invalid document update.' });
    if (stateVector !== undefined && (typeof stateVector !== 'string' || stateVector.length > 100000)) return ack({ error: 'Invalid state vector.' });
    const doc = getDocument(room, kind);
    const candidate = new Y.Doc();
    try {
      const bytes = Buffer.from(update, 'base64');
      const vector = stateVector ? Buffer.from(stateVector, 'base64') : undefined;
      // Validate before changing the authoritative document.
      Y.encodeStateAsUpdate(doc, vector);
      Y.applyUpdate(candidate, Y.encodeStateAsUpdate(doc));
      Y.applyUpdate(candidate, bytes);
      const language = candidate.getMap('settings').get('language');
      if (kind === 'code' && language !== undefined && !['python', 'cpp'].includes(language)) return ack({ error: 'Invalid language.' });
      if (Y.encodeStateAsUpdate(candidate).byteLength > 2000000 ||
          (kind === 'code' && candidate.getText('code').length > 100000) ||
          (kind === 'notes' && candidate.getXmlFragment('default').toString().length > 500000)) {
        return ack({ error: 'Document size limit reached.' });
      }
      Y.applyUpdate(doc, bytes);
      socket.to(room.roomId).emit('document:update', { kind, update });
      ack({ update: Buffer.from(Y.encodeStateAsUpdate(doc, vector)).toString('base64'), stateVector: Buffer.from(Y.encodeStateVector(doc)).toString('base64') });
    } catch {
      ack({ error: 'Invalid collaborative document.' });
    } finally { candidate.destroy(); }
  });
}
module.exports = { registerCollaboration, getDocument };
