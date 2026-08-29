const { v4: uuidv4 } = require('uuid');
const { roomStore } = require('../../rooms/RoomStore');
const { generateRoomCode } = require('../../rooms/roomCode');
const { selectNextHost } = require('../../services/hostTransfer');
const { createRoomSchema, joinRoomSchema } = require('../../services/validation');

/** @param {import('socket.io').Server} io @param {import('socket.io').Socket} socket */
function registerRoomHandlers(io, socket) {

  // ---- room:create ----
  socket.on('room:create', (payload, ack) => {
    const result = createRoomSchema.safeParse(payload);
    if (!result.success) {
      return ack?.({ error: { code: 'INVALID_PAYLOAD', message: result.error.errors[0]?.message ?? 'Invalid payload' } });
    }

    const { type = 'STUDY', name, subject, customSubject, durationMin, maxParticipants, displayName } = result.data;

    // Generate unique code (retry on collision)
    let roomCode;
    let attempts = 0;
    do {
      roomCode = generateRoomCode(type === 'CHAT' ? 'Chat' : subject);
      attempts++;
    } while (roomStore.codeExists(roomCode) && attempts < 20);

    const roomId = uuidv4();
    const participantId = uuidv4();
    const token = uuidv4();
    const now = Date.now();

    /** @type {import('../../types/index.js').Participant} */
    const participant = {
      participantId,
      token,
      displayName: displayName || `Guest ${Math.floor(1000 + Math.random() * 9000)}`,
      isHost: true,
      status: 'connected',
      joinedAt: now,
      socketId: socket.id,
      isFocusing: false,
    };

    /** @type {import('../../types/index.js').Room} */
    const room = {
      roomId,
      roomCode,
      type: type || 'STUDY',
      name: name.trim(),
      subject: type === 'CHAT' ? 'Chat' : subject,
      customSubject: type === 'CHAT' ? undefined : customSubject,
      createdAt: now,
      expiresAt: now + durationMin * 60 * 1000,
      durationMin,
      maxParticipants,
      hostId: participantId,
      participants: { [participantId]: participant },
      messages: [],
      sharedNotes: '',
      whiteboardState: [],
      focusSession: null,
      goals: [],
      quizState: null,
      codeState: { code: '', language: 'python' },
      files: [],
    };

    roomStore.create(room);
    socket.join(roomId);
    socket.data.roomId = roomId;
    socket.data.participantId = participantId;

    const publicRoom = roomStore.toPublicRoom(room);
    ack?.({ room: publicRoom, participantToken: token });

    // Notify existing participants (just the host here, but emit pattern consistent)
    socket.to(roomId).emit('participant:join', { participant: { ...participant, token: undefined } });

    console.log(`[room] Created ${roomCode} (${roomId}) by ${displayName}`);
  });

  // ---- room:join ----
  socket.on('room:join', (payload, ack) => {
    const result = joinRoomSchema.safeParse(payload);
    if (!result.success) {
      return ack?.({ error: { code: 'INVALID_PAYLOAD', message: 'That room code doesn\'t look right.' } });
    }

    const { roomCode, displayName, participantToken } = result.data;
    const room = roomStore.getByCode(roomCode);

    if (!room) {
      return ack?.({ error: { code: 'ROOM_NOT_FOUND', message: 'We couldn\'t find that room.' } });
    }
    if (Date.now() >= room.expiresAt) {
      return ack?.({ error: { code: 'ROOM_EXPIRED', message: 'This room has ended.' } });
    }

    const { roomId } = room;

    // Reconnection: try matching existing token
    if (participantToken) {
      const existing = roomStore.findParticipantByToken(roomId, participantToken);
      if (existing) {
        // Disconnect old socket if different
        if (existing.socketId && existing.socketId !== socket.id) {
          const oldSocket = io.sockets.sockets.get(existing.socketId);
          if (oldSocket) oldSocket.disconnect(true);
        }
        roomStore.updateParticipant(roomId, existing.participantId, {
          socketId: socket.id,
          status: 'connected',
        });
        socket.join(roomId);
        socket.data.roomId = roomId;
        socket.data.participantId = existing.participantId;

        const updatedRoom = roomStore.getById(roomId);
        const publicRoom = roomStore.toPublicRoom(updatedRoom);
        ack?.({ room: publicRoom, participantToken });

        // Notify others of reconnection
        socket.to(roomId).emit('participant:update', {
          participant: { ...updatedRoom.participants[existing.participantId], token: undefined },
        });
        return;
      }
    }

    // New join: check capacity
    const count = roomStore.participantCount(roomId);
    if (count >= room.maxParticipants) {
      return ack?.({ error: { code: 'ROOM_FULL', message: 'This room is full.' } });
    }

    const participantId = uuidv4();
    const token = uuidv4();
    const now = Date.now();

    /** @type {import('../../types/index.js').Participant} */
    const participant = {
      participantId,
      token,
      displayName: (displayName || `Guest ${Math.floor(1000 + Math.random() * 9000)}`).trim(),
      isHost: false,
      status: 'connected',
      joinedAt: now,
      socketId: socket.id,
      isFocusing: false,
    };

    roomStore.addParticipant(roomId, participant);
    socket.join(roomId);
    socket.data.roomId = roomId;
    socket.data.participantId = participantId;

    // Add system message
    const sysMsg = {
      id: uuidv4(),
      type: 'system',
      text: `${participant.displayName} joined the room`,
      createdAt: now,
    };
    room.messages.push(sysMsg);
    if (room.messages.length > 500) room.messages.shift();

    const updatedRoom = roomStore.getById(roomId);
    const publicRoom = roomStore.toPublicRoom(updatedRoom);
    ack?.({ room: publicRoom, participantToken: token });

    // Notify others
    socket.to(roomId).emit('participant:join', {
      participant: { ...participant, token: undefined },
    });
    io.to(roomId).emit('chat:message', { message: sysMsg });

    console.log(`[room] ${participant.displayName} joined ${roomCode}`);
  });

  // ---- room:leave ----
  socket.on('room:leave', () => {
    handleLeave(io, socket);
  });

  // ---- disconnect ----
  socket.on('disconnect', () => {
    handleLeave(io, socket);
  });
}

/**
 * Shared leave logic for both explicit room:leave and socket disconnect.
 * @param {import('socket.io').Server} io
 * @param {import('socket.io').Socket} socket
 */
function handleLeave(io, socket) {
  const { roomId, participantId } = socket.data ?? {};
  if (!roomId || !participantId) return;

  const room = roomStore.getById(roomId);
  if (!room) return;

  const leavingParticipant = room.participants[participantId];
  if (!leavingParticipant) return;

  roomStore.removeParticipant(roomId, participantId);
  socket.leave(roomId);
  socket.data.roomId = undefined;
  socket.data.participantId = undefined;

  const sysMsg = {
    id: uuidv4(),
    type: 'system',
    text: `${leavingParticipant.displayName} left the room`,
    createdAt: Date.now(),
  };
  room.messages.push(sysMsg);
  if (room.messages.length > 500) room.messages.shift();

  io.to(roomId).emit('participant:leave', { participantId });
  io.to(roomId).emit('chat:message', { message: sysMsg });

  // Host transfer if needed
  if (room.hostId === participantId) {
    const next = selectNextHost(roomId, participantId);
    if (next) {
      room.hostId = next.participantId;
      roomStore.updateParticipant(roomId, next.participantId, { isHost: true });
      const transferMsg = {
        id: uuidv4(),
        type: 'system',
        text: `${leavingParticipant.displayName} left — ${next.displayName} is now host`,
        createdAt: Date.now(),
      };
      room.messages.push(transferMsg);
      io.to(roomId).emit('host:transfer', { newHostId: next.participantId });
      io.to(roomId).emit('chat:message', { message: transferMsg });
    }
  }

  console.log(`[room] ${leavingParticipant.displayName} left ${room.roomCode}`);
}

module.exports = { registerRoomHandlers };
