const { v4: uuidv4 } = require('uuid');
const { roomStore } = require('../../rooms/RoomStore');
const { goalCreateSchema, goalUpdateSchema, goalDeleteSchema } = require('../../services/validation');

/**
 * @param {import('socket.io').Server} io
 * @param {import('socket.io').Socket} socket
 */
function registerGoalsHandlers(io, socket) {
  socket.on('goal:create', (payload) => {
    const { roomId, participantId } = socket.data ?? {};
    if (!roomId || !participantId) return;

    const result = goalCreateSchema.safeParse(payload);
    if (!result.success) return;

    const room = roomStore.getById(roomId);
    if (!room) return;

    /** @type {import('../../types/index.js').Goal} */
    const goal = {
      goalId: uuidv4(),
      text: result.data.text,
      completed: false,
      createdBy: participantId,
      createdAt: Date.now(),
    };

    room.goals.push(goal);
    io.to(roomId).emit('goal:create', { goal });
  });

  socket.on('goal:update', (payload) => {
    const { roomId } = socket.data ?? {};
    if (!roomId) return;

    const result = goalUpdateSchema.safeParse(payload);
    if (!result.success) return;

    const room = roomStore.getById(roomId);
    if (!room) return;

    const goal = room.goals.find((g) => g.goalId === result.data.goalId);
    if (!goal) return;

    goal.completed = result.data.completed;
    io.to(roomId).emit('goal:update', { goal });
  });

  socket.on('goal:delete', (payload) => {
    const { roomId, participantId } = socket.data ?? {};
    if (!roomId || !participantId) return;

    const result = goalDeleteSchema.safeParse(payload);
    if (!result.success) return;

    const room = roomStore.getById(roomId);
    if (!room) return;

    const goal = room.goals.find((g) => g.goalId === result.data.goalId);
    if (!goal) return;

    // Only creator or host can delete
    if (goal.createdBy !== participantId && room.hostId !== participantId) {
      socket.emit('error', { code: 'UNAUTHORIZED', message: 'You can only delete your own goals.' });
      return;
    }

    room.goals = room.goals.filter((g) => g.goalId !== result.data.goalId);
    io.to(roomId).emit('goal:delete', { goalId: result.data.goalId });
  });
}

module.exports = { registerGoalsHandlers };
