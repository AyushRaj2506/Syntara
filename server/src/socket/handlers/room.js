const { v4: uuidv4 } = require('uuid');
const { roomStore } = require('../../rooms/RoomStore');
const { generateRoomCode } = require('../../rooms/roomCode');
const { selectNextHost } = require('../../services/hostTransfer');
const { createRoomSchema, joinRoomSchema } = require('../../services/validation');
const { deleteRoomUploads } = require('../../rooms/roomUtils');

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
      return ack?.({ error: { code: 'ROOM_NOT_FOUND', message: 'Room not found. It may have ended or never existed.' } });
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
          if (oldSocket) {
            // Clear data first so handleLeave does not run for old socket
            oldSocket.data.roomId = undefined;
            oldSocket.data.participantId = undefined;
            oldSocket.disconnect(true);
          }
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

    // Guard against the same socket joining twice (e.g. double emit during reconnect race)
    if (socket.data.roomId === roomId && socket.data.participantId) {
      const existingP = room.participants[socket.data.participantId];
      if (existingP) {
        const publicRoom = roomStore.toPublicRoom(roomStore.getById(roomId));
        return ack?.({ room: publicRoom, participantToken: existingP.token });
      }
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

  // ---- room:remove-participant (host only) ----
  socket.on('room:remove-participant', (payload, ack) => {
    const { roomId, participantId: requesterId } = socket.data ?? {};
    if (!roomId || !requesterId) {
      return ack?.({ error: { code: 'NOT_IN_ROOM', message: 'You are not in a room.' } });
    }

    const room = roomStore.getById(roomId);
    if (!room) {
      return ack?.({ error: { code: 'ROOM_NOT_FOUND', message: 'Room not found.' } });
    }

    // Server-side host validation — never trust the client's isHost flag
    if (room.hostId !== requesterId) {
      console.warn(`[room] Non-host ${requesterId} attempted to remove participant in ${room.roomCode}`);
      return ack?.({ error: { code: 'FORBIDDEN', message: 'Only the host can remove participants.' } });
    }

    const targetParticipantId = payload?.targetParticipantId;
    if (!targetParticipantId) {
      return ack?.({ error: { code: 'INVALID_PAYLOAD', message: 'targetParticipantId is required.' } });
    }

    // Cannot remove yourself
    if (targetParticipantId === requesterId) {
      return ack?.({ error: { code: 'INVALID_PAYLOAD', message: 'You cannot remove yourself.' } });
    }

    const targetParticipant = room.participants[targetParticipantId];
    if (!targetParticipant) {
      return ack?.({ error: { code: 'PARTICIPANT_NOT_FOUND', message: 'Participant not found or already left.' } });
    }

    const targetSocketId = targetParticipant.socketId;

    // Remove from store
    roomStore.removeParticipant(roomId, targetParticipantId);

    // Add system message
    const sysMsg = {
      id: uuidv4(),
      type: 'system',
      text: `${targetParticipant.displayName} was removed from the room`,
      createdAt: Date.now(),
    };
    room.messages.push(sysMsg);
    if (room.messages.length > 500) room.messages.shift();

    // Notify remaining participants
    io.to(roomId).emit('participant:leave', { participantId: targetParticipantId });
    io.to(roomId).emit('chat:message', { message: sysMsg });

    // Notify the removed participant directly
    if (targetSocketId) {
      const targetSocket = io.sockets.sockets.get(targetSocketId);
      if (targetSocket) {
        // Clear their room data before emitting so their disconnect handler is a no-op
        targetSocket.data.roomId = undefined;
        targetSocket.data.participantId = undefined;
        targetSocket.emit('participant:removed', {
          message: 'You were removed from this room by the host.',
        });
        targetSocket.leave(roomId);
      }
    }

    ack?.({ success: true });
    console.log(`[room] Host ${requesterId} removed ${targetParticipant.displayName} from ${room.roomCode}`);

    // After host kick: if room is now empty, close it immediately
    closeIfEmpty(io, room);
  });

  // ---- disconnect ----
  socket.on('disconnect', () => {
    handleLeave(io, socket);
  });
}

/**
 * Shared leave logic for both explicit room:leave and socket disconnect.
 * Idempotent: if socket.data has already been cleared, this is a no-op.
 * @param {import('socket.io').Server} io
 * @param {import('socket.io').Socket} socket
 */
function handleLeave(io, socket) {
  const { roomId, participantId } = socket.data ?? {};
  if (!roomId || !participantId) return;

  const room = roomStore.getById(roomId);
  if (!room) {
    // Room already cleaned up; just clear socket data
    socket.data.roomId = undefined;
    socket.data.participantId = undefined;
    return;
  }

  const leavingParticipant = room.participants[participantId];
  if (!leavingParticipant) {
    // Participant already removed (e.g. by host kick); clear socket data and bail
    socket.data.roomId = undefined;
    socket.data.participantId = undefined;
    return;
  }

  // Clear socket data BEFORE emitting so any re-entrant disconnect is a no-op
  socket.data.roomId = undefined;
  socket.data.participantId = undefined;

  roomStore.removeParticipant(roomId, participantId);
  socket.leave(roomId);

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

  // Host transfer if needed (only matters if room is still alive with other participants)
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

  // Immediately close the room if it's now empty — no grace period.
  closeIfEmpty(io, room);
}

/**
 * If the room has zero participants remaining, immediately invalidate and delete it.
 * This is called after every participant removal (leave or kick).
 * No grace period — once empty, the room is gone and the code is no longer joinable.
 *
 * @param {import('socket.io').Server} io
 * @param {import('../../types/index.js').Room} room - the room object (may already be mutated)
 */
function closeIfEmpty(io, room) {
  const remaining = roomStore.participantCount(room.roomId);
  if (remaining > 0) return; // still has participants, nothing to do

  // Emit room:closed to any lingering sockets (defensive — normally none remain)
  io.to(room.roomId).emit('room:closed', { reason: 'empty' });
  io.in(room.roomId).socketsLeave(room.roomId);

  // Delete room from active store — code is immediately non-joinable after this line
  roomStore.delete(room.roomId);

  // Clean up any server-side uploads for this room
  deleteRoomUploads(room.roomId);

  console.log(`[room] ${room.roomCode} closed — all participants left.`);
}

module.exports = { registerRoomHandlers };
