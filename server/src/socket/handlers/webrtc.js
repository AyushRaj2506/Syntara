const { roomStore } = require('../../rooms/RoomStore');

/**
 * WebRTC Signaling & P2P File Transfer relay handler.
 * Relays offers, answers, ICE candidates and file metadata between peers.
 * Binary file content is NEVER routed through Socket.IO.
 *
 * @param {import('socket.io').Server} io
 * @param {import('socket.io').Socket} socket
 */
function registerWebRTCHandlers(io, socket) {
  // Relay WebRTC SDP offers/answers and ICE candidates
  socket.on('webrtc:signal', (payload) => {
    const { roomId, participantId } = socket.data ?? {};
    if (!roomId || !participantId) return;

    const { targetParticipantId, signal } = payload ?? {};
    if (!targetParticipantId || !signal) return;

    const room = roomStore.getById(roomId);
    if (!room) return;

    const targetParticipant = room.participants[targetParticipantId];
    if (!targetParticipant || !targetParticipant.socketId) return;

    // Send signal directly to the target peer's socket
    io.to(targetParticipant.socketId).emit('webrtc:signal', {
      senderParticipantId: participantId,
      signal,
    });
  });

  // Notify room peers that a file transfer stream is initiating
  socket.on('webrtc:file-announce', (payload) => {
    const { roomId, participantId } = socket.data ?? {};
    if (!roomId || !participantId) return;

    const room = roomStore.getById(roomId);
    if (!room) return;

    const participant = room.participants[participantId];
    if (!participant) return;

    const { transferId, fileName, fileSize, fileType, caption } = payload ?? {};
    if (!transferId || !fileName) return;

    // Broadcast file transfer announcement to all peers in the room
    socket.to(roomId).emit('webrtc:file-announce', {
      transferId,
      fileName,
      fileSize,
      fileType,
      caption,
      senderParticipantId: participantId,
      senderDisplayName: participant.displayName,
      createdAt: Date.now(),
    });
  });
}

module.exports = { registerWebRTCHandlers };
