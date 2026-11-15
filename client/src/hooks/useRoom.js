import { useState, useEffect, useRef, useMemo } from 'react';
import { socket } from '../lib/socket';
import { useToast } from '../components/Toast';
let pendingLeave;

/**
 * Central room state manager. Subscribes to all socket events and provides
 * action dispatchers. Sliced into independent state atoms to prevent
 * cross-feature re-renders.
 *
 * @param {string|null} roomCode - null when not in a room
 * @param {string|null} displayName
 * @returns {{\
 *   room: object|null,
 *   me: object|null,
 *   chatMessages: object[],
 *   goals: object[],
 *   focusSession: object|null,
 *   quizState: object|null,
 *   actions: object,
 * }}
 */
export function useRoom(roomCode, displayName) {
  const { addToast } = useToast();
  const [room, setRoom] = useState(null);
  const [me, setMe] = useState(null);
  const [joinError, setJoinError] = useState(null);
  const [chatMessages, setChatMessages] = useState([]);
  const [goals, setGoals] = useState([]);
  const [focusSession, setFocusSession] = useState(null);
  const [quizState, setQuizState] = useState(null);

  const tokenKey = roomCode ? `syntara:session:${roomCode}` : null;

  // Track whether a join is already in-flight to prevent double-join race
  const joiningRef = useRef(false);
  // Track the participantId we're currently joined as (survives re-renders)
  const myParticipantIdRef = useRef(null);

  // ---- Connect and join ----
  useEffect(() => {
    clearTimeout(pendingLeave);
    if (!roomCode) return;

    let cancelled = false;
    let joinAttempt = 0;
    const connectionDeadline = setTimeout(() => {
      if (!socket.connected && !cancelled) setJoinError({ code: 'TIMEOUT', message: 'Server is unavailable. Please refresh to retry.' });
    }, 60000);

    if (!socket.connected) socket.connect();

    const doJoin = () => {
      // Guard: don't double-emit if we're already mid-join for this room
      if (joiningRef.current) return;
      joiningRef.current = true;

      const attempt = ++joinAttempt;
      clearTimeout(connectionDeadline);
      socket.timeout(15000).emit('room:join', {
        roomCode: roomCode.toUpperCase(),
        displayName: displayName || undefined,
        participantToken: sessionStorage.getItem(tokenKey) || undefined,
      }, (err, response) => {
        if (cancelled || attempt !== joinAttempt) return;
        joiningRef.current = false;
        if (err) { setJoinError({ code: 'TIMEOUT', message: 'Connection timed out. Please refresh to retry.' }); return; }

        if (response?.error) {
          console.error('[room] Join error:', response.error);
          setJoinError(response.error);
          return;
        }
        // Clear any previous join error on successful join
        setJoinError(null);
        const { room: roomData, participantToken } = response;
        if (participantToken && tokenKey) {
          sessionStorage.setItem(tokenKey, participantToken);
        }
        setRoom(roomData);
        setChatMessages(roomData.messages ?? []);
        setGoals(roomData.goals ?? []);
        setFocusSession(roomData.focusSession ?? null);
        setQuizState(roomData.quizState ?? null);

        // Identify self by matching socketId (server just gave us current state)
        const myParticipant = Object.values(roomData.participants).find(
          (p) => p.socketId === socket.id
        );
        if (myParticipant) {
          setMe(myParticipant);
          myParticipantIdRef.current = myParticipant.participantId;
        }
      });
    };

    const onDisconnect = () => { joiningRef.current = false; };
    socket.on('connect', doJoin);
    socket.on('disconnect', onDisconnect);
    if (socket.connected) doJoin();

    const onError = error => addToast({ message: error.message || 'The action could not be completed.', type: 'error' });
    socket.on('error', onError);
    // ---- Room events ----
    const onRoomClosed = ({ reason }) => {
      setRoom((prev) => prev ? { ...prev, _closed: reason } : prev);
    };
    socket.on('room:closed', onRoomClosed);

    // ---- Participant events ----
    const onParticipantJoin = ({ participant }) => {
      setRoom((prev) => {
        if (!prev) return prev;
        // Idempotent: if participantId already exists, upsert (don't create duplicate)
        return { ...prev, participants: { ...prev.participants, [participant.participantId]: participant } };
      });
    };
    const onParticipantLeave = ({ participantId }) => {
      setRoom((prev) => {
        if (!prev) return prev;
        const { [participantId]: _removed, ...rest } = prev.participants;
        return { ...prev, participants: rest };
      });
    };
    const onParticipantUpdate = ({ participant }) => {
      setRoom((prev) => {
        if (!prev) return prev;
        return { ...prev, participants: { ...prev.participants, [participant.participantId]: participant } };
      });
      setMe((prev) => prev?.participantId === participant.participantId ? participant : prev);
    };
    const onHostTransfer = ({ newHostId }) => {
      setRoom((prev) => {
        if (!prev) return prev;
        const participants = { ...prev.participants };
        for (const id in participants) {
          participants[id] = { ...participants[id], isHost: id === newHostId };
        }
        return { ...prev, hostId: newHostId, participants };
      });
      setMe((prev) => prev ? { ...prev, isHost: prev.participantId === newHostId } : prev);
    };

    // participant:removed fires when the local user was kicked by the host.
    // The server has already cleaned up; the client just needs to surface the message
    // and navigate home. The navigation is triggered in RoomLayout via the room._removed flag.
    const onParticipantRemoved = ({ message }) => {
      setRoom((prev) => prev ? { ...prev, _closed: 'removed', _removedMessage: message } : prev);
      // Remove the session token so they can't silently rejoin
      if (tokenKey) sessionStorage.removeItem(tokenKey);
    };

    socket.on('participant:join', onParticipantJoin);
    socket.on('participant:leave', onParticipantLeave);
    socket.on('participant:update', onParticipantUpdate);
    socket.on('host:transfer', onHostTransfer);
    socket.on('participant:removed', onParticipantRemoved);

    const onChatMessage = ({ message }) => {
      setChatMessages((prev) => {
        // Prevent duplicate append if we already optimistically added it
        if (prev.some((m) => m.id === message.id)) return prev.map(m => m.id === message.id ? { ...message, delivery: 'sent' } : m);
        const next = [...prev, message];
        return next.slice(-500);
      });
    };
    socket.on('chat:message', onChatMessage);

    const onNotes = ({ content, revision }) => setRoom(prev => prev ? { ...prev, sharedNotes: content, notesRevision: revision } : prev);
    const onCode = (state) => setRoom(prev => prev ? { ...prev, codeState: state } : prev);
    socket.on('notes:update', onNotes);
    socket.on('code:update', onCode);

    // ---- Goals ----
    const onGoalCreate = ({ goal }) => setGoals((prev) => [...prev, goal]);
    const onGoalUpdate = ({ goal }) => setGoals((prev) => prev.map((g) => g.goalId === goal.goalId ? goal : g));
    const onGoalDelete = ({ goalId }) => setGoals((prev) => prev.filter((g) => g.goalId !== goalId));
    socket.on('goal:create', onGoalCreate);
    socket.on('goal:update', onGoalUpdate);
    socket.on('goal:delete', onGoalDelete);

    // ---- Whiteboard state sync ----
    // Keep room.whiteboardState in sync so initialStrokes prop stays accurate.
    // Without this, a re-render would re-apply stale strokes from room state.
    const onWhiteboardClear = () => {
      setRoom((prev) => prev ? { ...prev, whiteboardState: [] } : prev);
    };
    const onWhiteboardUndo = ({ strokeId }) => {
      setRoom((prev) => {
        if (!prev) return prev;
        const next = strokeId
          ? prev.whiteboardState.filter((s) => s.strokeId !== strokeId)
          : prev.whiteboardState.slice(0, -1);
        return { ...prev, whiteboardState: next };
      });
    };
    const onWhiteboardDraw = ({ strokeId, points, color, size, done, participantId }) => {
      if (done) {
        setRoom((prev) => {
          if (!prev) return prev;
          const existing = prev.whiteboardState.find((s) => s.strokeId === strokeId);
          if (existing) {
            return {
              ...prev,
              whiteboardState: prev.whiteboardState.map((s) =>
                s.strokeId === strokeId ? { ...s, points } : s
              ),
            };
          }
          return {
            ...prev,
            whiteboardState: [...prev.whiteboardState, { strokeId, participantId, color, size, points }],
          };
        });
      }
    };
    socket.on('whiteboard:clear', onWhiteboardClear);
    socket.on('whiteboard:undo', onWhiteboardUndo);
    socket.on('whiteboard:draw', onWhiteboardDraw);

    // ---- Focus ----
    const onFocusStart = ({ focusSession: fs }) => setFocusSession(fs);
    const onFocusPause = ({ focusSession: fs }) => setFocusSession(fs);
    const onFocusResume = ({ focusSession: fs }) => setFocusSession(fs);
    const onFocusEnd = ({ focusSession: fs }) => setFocusSession(fs);
    socket.on('focus:start', onFocusStart);
    socket.on('focus:pause', onFocusPause);
    socket.on('focus:resume', onFocusResume);
    socket.on('focus:end', onFocusEnd);

    // ---- Quiz ----
    const onQuizStart = ({ quizState: qs }) => setQuizState(qs);
    const onQuizNext  = ({ quizState: qs }) => setQuizState(qs);
    const onQuizResults = ({ questionIndex, correctIndex, tally, leaderboard, status }) => {
      setQuizState((prev) => prev ? { ...prev, status: status || prev.status, _results: { questionIndex, correctIndex, tally }, _leaderboard: leaderboard } : prev);
    };
    socket.on('quiz:start', onQuizStart);
    socket.on('quiz:next', onQuizNext);
    socket.on('quiz:results', onQuizResults);

    return () => {
      // Cancel in-flight join if the component unmounts mid-request
      joiningRef.current = false;
      socket.off('connect', doJoin);
      cancelled = true;
      clearTimeout(connectionDeadline);
      socket.off('error', onError);
      pendingLeave = setTimeout(() => { if (socket.connected) socket.emit('room:leave'); }, 0);
      socket.off('disconnect', onDisconnect);
      socket.off('room:closed', onRoomClosed);
      socket.off('participant:join', onParticipantJoin);
      socket.off('participant:leave', onParticipantLeave);
      socket.off('participant:update', onParticipantUpdate);
      socket.off('host:transfer', onHostTransfer);
      socket.off('participant:removed', onParticipantRemoved);
      socket.off('chat:message', onChatMessage);
      socket.off('notes:update', onNotes);
      socket.off('code:update', onCode);
      socket.off('goal:create', onGoalCreate);
      socket.off('goal:update', onGoalUpdate);
      socket.off('goal:delete', onGoalDelete);
      socket.off('whiteboard:clear', onWhiteboardClear);
      socket.off('whiteboard:undo', onWhiteboardUndo);
      socket.off('whiteboard:draw', onWhiteboardDraw);
      socket.off('focus:start', onFocusStart);
      socket.off('focus:pause', onFocusPause);
      socket.off('focus:resume', onFocusResume);
      socket.off('focus:end', onFocusEnd);
      socket.off('quiz:start', onQuizStart);
      socket.off('quiz:next', onQuizNext);
      socket.off('quiz:results', onQuizResults);
    };
  }, [roomCode]); // eslint-disable-line react-hooks/exhaustive-deps

  // ---- Actions ----
  const actions = useMemo(() => ({
    roomCode,
    sendChat: (text, file, id) => {
      const messageId = id || crypto.randomUUID();
      
      // Optimistically append the message if text is provided
      // (For file uploads, the server has to process it first, so we might skip optimistic for files, 
      // but if we want we can do it. For now let's just do it for everything).
      setChatMessages((prev) => {
        const optimisticMsg = {
          id: messageId,
          type: 'user',
          participantId: me?.participantId,
          displayName: me?.displayName,
          text: text || '',
          file,
          createdAt: Date.now(),
          delivery: 'pending',
        };
        return [...prev.filter(m => m.id !== messageId), optimisticMsg].slice(-500);
      });
      
      const finish = (err, response) => setChatMessages(prev => prev.map(m => m.id !== messageId ? m :
        response?.message ? { ...response.message, delivery: 'sent' } :
          m.delivery === 'sent' ? m : { ...m, delivery: 'failed', error: response?.error?.message || 'Not delivered. Retry when connected.' }));
      if (!socket.connected) finish(true);
      else socket.timeout(10000).emit('chat:send', { id: messageId, text, file }, finish);
    },
    appendLocalMessage: ((msg) => {
      setChatMessages((prev) => {
        if (prev.some((m) => m.id === msg.id)) return prev;
        return [...prev, msg].slice(-500);
      });
    }),

    pingEditing: (() => socket.emit('notes:editing')),
    drawStroke: ((payload) => socket.emit('whiteboard:draw', payload)),
    clearBoard: (() => socket.emit('whiteboard:clear')),
    undoStroke: ((strokeId) => socket.emit('whiteboard:undo', { strokeId })),
    startFocus: ((durationMin, breakMin) => socket.emit('focus:start', { durationMin, breakMin })),
    pauseFocus: (() => socket.emit('focus:pause')),
    resumeFocus: (() => socket.emit('focus:resume')),
    endFocus: (() => socket.emit('focus:end')),
    createGoal: ((text) => socket.emit('goal:create', { text })),
    toggleGoal: ((goalId, completed) => socket.emit('goal:update', { goalId, completed })),
    deleteGoal: ((goalId) => socket.emit('goal:delete', { goalId })),
    startQuiz: ((questions) => socket.emit('quiz:start', { questions })),
    submitQuizAnswer: ((questionIndex, optionIndex) =>
      socket.emit('quiz:submit', { questionIndex, optionIndex })),
    removeParticipant: ((targetParticipantId) => {
      socket.emit('room:remove-participant', { targetParticipantId }, (response) => {
        if (response?.error) {
          console.error('[room] Remove participant error:', response.error);
        }
      });
    }),
    leaveRoom: (() => {
      socket.emit('room:leave');
      socket.disconnect();
      myParticipantIdRef.current = null;
      if (tokenKey) sessionStorage.removeItem(tokenKey);
    }),
  }), [me, tokenKey, roomCode]);

  return { room, me, joinError, chatMessages, goals, focusSession, quizState, actions };
}
