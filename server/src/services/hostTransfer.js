const { roomStore } = require('../rooms/RoomStore');

/**
 * Select the next host deterministically: earliest joinedAt among remaining
 * connected participants (falls back to reconnecting if none connected).
 * @param {string} roomId
 * @param {string} excludeId - the departing participant's id
 * @returns {import('../types/index.js').Participant|undefined}
 */
function selectNextHost(roomId, excludeId) {
  const room = roomStore.getById(roomId);
  if (!room) return undefined;

  const all = Object.values(room.participants).filter(
    (p) => p.participantId !== excludeId
  );
  if (all.length === 0) return undefined;

  const connected = all.filter((p) => p.status === 'connected');
  const pool = connected.length > 0 ? connected : all;
  return pool.sort((a, b) => a.joinedAt - b.joinedAt)[0];
}

module.exports = { selectNextHost };
