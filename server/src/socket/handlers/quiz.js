const { publicQuiz } = require('../../services/quizView');
const { roomStore } = require('../../rooms/RoomStore');
const { quizStartSchema, quizSubmitSchema } = require('../../services/validation');

/** @type {Map<string, NodeJS.Timeout>} roomId → question timer handle */
const questionTimers = new Map();

/**
 * @param {import('socket.io').Server} io
 * @param {import('socket.io').Socket} socket
 */
function registerQuizHandlers(io, socket) {
  socket.on('quiz:start', (payload) => {
    const { roomId, participantId } = socket.data ?? {};
    if (!roomId || !participantId) return;

    const room = roomStore.getById(roomId);
    if (!room) return;

    if (room.hostId !== participantId) {
      socket.emit('error', { code: 'UNAUTHORIZED', message: 'Only the host can start a quiz.' });
      return;
    }

    if (room.quizState?.status === 'IN_PROGRESS') return;
    const result = quizStartSchema.safeParse(payload);
    if (!result.success) return;

    room.quizState = {
      quizId: require('crypto').randomUUID(),
      questions: result.data.questions,
      currentIndex: 0,
      status: 'IN_PROGRESS',
      answers: {},
      startedBy: participantId,
      questionEndsAt: Date.now() + result.data.questions[0].timerSec * 1000,
    };

    io.to(roomId).emit('quiz:start', { quizState: publicQuiz(room.quizState) });
    scheduleQuestionEnd(io, roomId, result.data.questions[0].timerSec);
  });

  socket.on('quiz:submit', (payload) => {
    const { roomId, participantId } = socket.data ?? {};
    if (!roomId || !participantId) return;

    const result = quizSubmitSchema.safeParse(payload);
    if (!result.success) return;

    const room = roomStore.getById(roomId);
    if (!room || !room.quizState || room.quizState.status !== 'IN_PROGRESS') return;

    if (room.quizState._results) return;
    const { questionIndex, optionIndex } = result.data;

    // Reject late submissions (question already moved on)
    if (questionIndex !== room.quizState.currentIndex) return;

    // Reject past deadline
    if (room.quizState.questionEndsAt && Date.now() > room.quizState.questionEndsAt) return;

    if (!room.quizState.answers[participantId]) {
      room.quizState.answers[participantId] = {};
    }
    // Don't allow changing an already-submitted answer
    if (room.quizState.answers[participantId][questionIndex] !== undefined) return;
    room.quizState.answers[participantId][questionIndex] = optionIndex;

    // Check if all connected participants have answered
    const connectedParticipants = Object.values(room.participants).filter(
      (p) => p.status === 'connected'
    );
    const allAnswered = connectedParticipants.every(
      (p) => room.quizState.answers[p.participantId]?.[questionIndex] !== undefined
    );
    if (allAnswered) {
      const handle = questionTimers.get(roomId);
      if (handle) { clearTimeout(handle); questionTimers.delete(roomId); }
      revealAndAdvance(io, roomId);
    }
  });
}

/**
 * Schedule auto-advance after the question timer elapses.
 * @param {import('socket.io').Server} io
 * @param {string} roomId
 * @param {number} timerSec
 */
function scheduleQuestionEnd(io, roomId, timerSec) {
  const existing = questionTimers.get(roomId);
  if (existing) clearTimeout(existing);

  const handle = setTimeout(() => {
    questionTimers.delete(roomId);
    revealAndAdvance(io, roomId);
  }, timerSec * 1000);
  handle.unref?.();
  questionTimers.set(roomId, handle);
}

/**
 * Reveal the current question result, compute leaderboard, and advance or end.
 * @param {import('socket.io').Server} io
 * @param {string} roomId
 */
function revealAndAdvance(io, roomId) {
  const room = roomStore.getById(roomId);
  if (!room || !room.quizState || room.quizState._results) return;

  const { currentIndex, questions, answers } = room.quizState;
  const question = questions[currentIndex];
  if (!question) return;

  // Compute per-option tally
  const tally = [0, 0, 0, 0];
  for (const pAnswers of Object.values(answers)) {
    const chosen = pAnswers[currentIndex];
    if (chosen !== undefined) tally[chosen]++;
  }

  const isLast = currentIndex >= questions.length - 1;

  // Compute leaderboard (total correct answers × 100 per question for simplicity)
  const scores = computeScores(questions, answers);
  const leaderboard = Object.entries(scores)
    .map(([pid, score]) => ({
      participantId: pid,
      displayName: room.participants[pid]?.displayName ?? 'Unknown',
      score,
    }))
    .sort((a, b) => b.score - a.score);

  room.quizState._results = { questionIndex: currentIndex, correctIndex: question.correctIndex, tally };
  room.quizState._leaderboard = isLast ? leaderboard : null;
  if (isLast) room.quizState.status = 'COMPLETED';
  io.to(roomId).emit('quiz:results', {
    status: room.quizState.status,
    questionIndex: currentIndex,
    correctIndex: question.correctIndex,
    tally,
    leaderboard: isLast ? leaderboard : null,
  });

  if (isLast) {
    room.quizState.status = 'COMPLETED';
    return;
  }

  // Advance after 3s reveal
  const quizId = room.quizState.quizId;
  const advanceTimer = setTimeout(() => {
    const r = roomStore.getById(roomId);
    if (!r || r.quizState?.quizId !== quizId || r.quizState.status !== 'IN_PROGRESS') return;

    delete r.quizState._results;
    r.quizState.currentIndex++;
    const nextQ = r.quizState.questions[r.quizState.currentIndex];
    r.quizState.questionEndsAt = Date.now() + nextQ.timerSec * 1000;

    io.to(roomId).emit('quiz:next', { quizState: publicQuiz(r.quizState) });
    scheduleQuestionEnd(io, roomId, nextQ.timerSec);
  }, 3000);
  advanceTimer.unref?.();
  questionTimers.set(roomId, advanceTimer);
}

/**
 * Compute total scores for all participants.
 * @param {import('../../types/index.js').QuizQuestion[]} questions
 * @param {Record<string, Record<number, number>>} answers
 * @returns {Record<string, number>}
 */
function computeScores(questions, answers) {
  const scores = {};
  for (const [pid, pAnswers] of Object.entries(answers)) {
    let score = 0;
    for (const [qIdx, chosen] of Object.entries(pAnswers)) {
      if (questions[qIdx] && questions[qIdx].correctIndex === Number(chosen)) {
        score += 100;
      }
    }
    scores[pid] = score;
  }
  return scores;
}

function clearQuizTimer(roomId) {
  clearTimeout(questionTimers.get(roomId));
  questionTimers.delete(roomId);
}
module.exports = { registerQuizHandlers, clearQuizTimer };
