import { useState, useEffect, useRef, useCallback } from 'react';
import { socket } from '../lib/socket';

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
    if (!roomCode) return;

    const savedToken = tokenKey ? sessionStorage.getItem(tokenKey) : null;

    if (!socket.connected) socket.connect();

    const doJoin = () => {
      // Guard: don't double-emit if we're already mid-join for this room
      if (joiningRef.current) return;
      joiningRef.current = true;

      socket.emit('room:join', {
        roomCode: roomCode.toUpperCase(),
        displayName: displayName ?? undefined,
        participantToken: savedToken ?? undefined,
      }, (response) => {
        joiningRef.current = false;

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

    if (socket.connected) {
      doJoin();
    } else {
      socket.once('connect', doJoin);
    }

    // Handle mid-session reconnects (transport-level reconnect, not initial connect)
    // socket.io.on('reconnect') fires ONLY on re-connections, not on initial connect,
    // which prevents the double-join race.
    const onReconnect = () => {
      joiningRef.current = false; // Reset flag in case it was stuck from a dropped request
      const token = tokenKey ? sessionStorage.getItem(tokenKey) : null;
      socket.emit('room:join', {
        roomCode: roomCode.toUpperCase(),
        displayName: displayName ?? undefined,
        participantToken: token ?? undefined,
      }, (response) => {
        if (response?.room) {
          setRoom(response.room);
          setChatMessages(response.room.messages ?? []);
          setGoals(response.room.goals ?? []);
          setFocusSession(response.room.focusSession ?? null);
          setQuizState(response.room.quizState ?? null);
          // Re-identify self after reconnect
          const myParticipant = Object.values(response.room.participants).find(
            (p) => p.socketId === socket.id
          );
          if (myParticipant) {
            setMe(myParticipant);
            myParticipantIdRef.current = myParticipant.participantId;
          }
        }
      });
    };

    // Use the socket manager's reconnect event (fires AFTER transport reconnects,
    // NOT on the initial connection — preventing the double-join bug).
    socket.io.on('reconnect', onReconnect);

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
        if (prev.some((m) => m.id === message.id)) return prev;
        const next = [...prev, message];
        return next.slice(-500);
      });
    };
    socket.on('chat:message', onChatMessage);

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
    const onQuizResults = ({ questionIndex, correctIndex, tally, leaderboard }) => {
      setQuizState((prev) => prev ? { ...prev, _results: { questionIndex, correctIndex, tally }, _leaderboard: leaderboard } : prev);
    };
    socket.on('quiz:start', onQuizStart);
    socket.on('quiz:next', onQuizNext);
    socket.on('quiz:results', onQuizResults);

    return () => {
      // Cancel in-flight join if the component unmounts mid-request
      joiningRef.current = false;
      socket.off('connect', doJoin);
      socket.io.off('reconnect', onReconnect);
      socket.off('room:closed', onRoomClosed);
      socket.off('participant:join', onParticipantJoin);
      socket.off('participant:leave', onParticipantLeave);
      socket.off('participant:update', onParticipantUpdate);
      socket.off('host:transfer', onHostTransfer);
      socket.off('participant:removed', onParticipantRemoved);
      socket.off('chat:message', onChatMessage);
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
  const actions = {
    sendChat: useCallback((text, file, id) => {
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
        };
        return [...prev, optimisticMsg].slice(-500);
      });
      
      socket.emit('chat:send', { id: messageId, text, file });
    }, [me]),
    appendLocalMessage: useCallback((msg) => {
      setChatMessages((prev) => {
        if (prev.some((m) => m.id === msg.id)) return prev;
        return [...prev, msg].slice(-500);
      });
    }, []),
    updateNotes: useCallback((content) => socket.emit('notes:update', { content }), []),

    clearNotes: useCallback(() => socket.emit('notes:clear'), []),
    pingEditing: useCallback(() => socket.emit('notes:editing'), []),
    drawStroke: useCallback((payload) => socket.emit('whiteboard:draw', payload), []),
    clearBoard: useCallback(() => socket.emit('whiteboard:clear'), []),
    undoStroke: useCallback((strokeId) => socket.emit('whiteboard:undo', { strokeId }), []),
    updateCode: useCallback((code, language) => socket.emit('code:update', { code, language }), []),
    clearCode: useCallback(() => socket.emit('code:clear'), []),
    startFocus: useCallback((durationMin, breakMin) => socket.emit('focus:start', { durationMin, breakMin }), []),
    pauseFocus: useCallback(() => socket.emit('focus:pause'), []),
    resumeFocus: useCallback(() => socket.emit('focus:resume'), []),
    endFocus: useCallback(() => socket.emit('focus:end'), []),
    createGoal: useCallback((text) => socket.emit('goal:create', { text }), []),
    toggleGoal: useCallback((goalId, completed) => socket.emit('goal:update', { goalId, completed }), []),
    deleteGoal: useCallback((goalId) => socket.emit('goal:delete', { goalId }), []),
    startQuiz: useCallback((questions) => socket.emit('quiz:start', { questions }), []),
    submitQuizAnswer: useCallback((questionIndex, optionIndex) =>
      socket.emit('quiz:submit', { questionIndex, optionIndex }), []),
    removeParticipant: useCallback((targetParticipantId) => {
      socket.emit('room:remove-participant', { targetParticipantId }, (response) => {
        if (response?.error) {
          console.error('[room] Remove participant error:', response.error);
        }
      });
    }, []),
    leaveRoom: useCallback(() => {
      socket.emit('room:leave');
      socket.disconnect();
      myParticipantIdRef.current = null;
      if (tokenKey) sessionStorage.removeItem(tokenKey);
    }, [tokenKey]),
  };

  return { room, me, joinError, chatMessages, goals, focusSession, quizState, actions };
}
