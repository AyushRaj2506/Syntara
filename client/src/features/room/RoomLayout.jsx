import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Users, X } from 'lucide-react';
import { useRoom } from '../../hooks/useRoom';
import { RoomTopBar } from './RoomTopBar';
import { ParticipantList } from './participants/ParticipantList';
import { Chat } from './chat/Chat';
import { StudyNotes } from './notes/StudyNotes';
import { Whiteboard } from './whiteboard/Whiteboard';
import { CodeScratchpad } from './code/CodeScratchpad';
import { FocusTimer } from './focus/FocusTimer';
import { GoalList } from './goals/GoalList';
import { Quiz } from './quiz/Quiz';
import { useToast } from '../../components/Toast';
import './RoomLayout.css';

/**
 * The full room workspace — adapts between Study Room and Chat Room modes.
 */
export function RoomLayout() {
  const { roomCode } = useParams();
  const navigate = useNavigate();
  const { addToast } = useToast();

  const savedName = sessionStorage.getItem('syntara:displayName') ?? '';
  const [displayName] = useState(savedName);

  const {
    room,
    me,
    connectionStatus,
    chatMessages,
    goals,
    focusSession,
    quizState,
    actions,
  } = useRoom(roomCode, displayName);

  // Center tab state for Study Rooms: 'notes' | 'whiteboard' | 'code'
  const [centerTab, setCenterTab] = useState('notes');

  // Mobile bottom tab: 'notes' | 'whiteboard' | 'code' | 'chat' | 'focus' | 'goals' (or 'chat' | 'members' in Chat mode)
  const isChatMode = room?.type === 'CHAT';
  const [mobileTab, setMobileTab] = useState(() => (isChatMode ? 'chat' : 'notes'));

  // Tablet drawer
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Unread chat count
  const [unreadCount, setUnreadCount] = useState(0);
  const [lastReadCount, setLastReadCount] = useState(0);

  useEffect(() => {
    if (isChatMode) {
      setMobileTab('chat');
    }
  }, [isChatMode]);

  // Connection status toasts
  useEffect(() => {
    if (connectionStatus === 'connected' && room) {
      addToast({ message: 'Connection restored', type: 'success' });
    }
  }, [connectionStatus]); // eslint-disable-line

  // Expiry warning (5 min)
  useEffect(() => {
    if (!room) return;
    const remaining = room.expiresAt - Date.now();
    if (remaining > 5 * 60 * 1000) {
      const t = setTimeout(() => {
        addToast({ message: 'This room ends in 5 minutes', type: 'info', duration: 6000 });
      }, remaining - 5 * 60 * 1000);
      return () => clearTimeout(t);
    }
  }, [room?.expiresAt]); // eslint-disable-line

  // Unread chat counter
  useEffect(() => {
    if (mobileTab !== 'chat') {
      setUnreadCount(chatMessages.length - lastReadCount);
    }
  }, [chatMessages.length, mobileTab, lastReadCount]);

  const markChatRead = () => {
    setLastReadCount(chatMessages.length);
    setUnreadCount(0);
  };

  // Room ended state
  if (room?._closed) {
    return (
      <div className="room-ended">
        <p className="text-heading-lg">This room has ended.</p>
        <p className="text-body-md" style={{ color: 'var(--color-text-secondary)' }}>
          {room._closed === 'expired' ? 'The session time ran out.' : 'All participants left the room.'}
        </p>
        <button type="button" className="room-ended__btn" onClick={() => navigate('/')}>
          Return Home
        </button>
      </div>
    );
  }

  if (!room) {
    return (
      <div className="room-loading">
        <div className="room-loading__spinner" aria-label="Loading room…" />
        <p className="text-body-sm" style={{ color: 'var(--color-text-tertiary)' }}>Joining room…</p>
      </div>
    );
  }

  const isHost = me?.isHost ?? false;
  const participants = Object.values(room.participants);
  const quizActive = quizState && quizState.status === 'IN_PROGRESS';
  const effectiveCenterTab = quizActive ? 'quiz' : centerTab;

  return (
    <div className={`room-layout ${focusSession?.status === 'FOCUSING' ? 'room-layout--focusing' : ''}`}>
      <RoomTopBar
        room={room}
        me={me}
        connectionStatus={connectionStatus}
        onOpenDrawer={() => setDrawerOpen(true)}
        onLeave={() => {
          actions.leaveRoom();
          navigate('/');
        }}
      />

      {/* ============================================================
          CHAT ROOM EXPERIENCE
          ============================================================ */}
      {isChatMode ? (
        <div className="room-layout__body room-layout__body--chat-only">
          {/* Left sidebar: Members & Room Info */}
          <aside className="room-layout__left room-layout__left--chat-mode">
            <ParticipantList participants={participants} hostId={room.hostId} />
            <div className="chat-room-info-card">
              <span className="text-label text-tertiary">Room Info</span>
              <p className="text-body-sm text-secondary mt-1">
                Temporary chat and file-sharing room. All messages and files expire when the room ends.
              </p>
            </div>
          </aside>

          {/* Main workspace: Full-width Chat */}
          <main className="room-layout__center room-layout__center--chat-mode" role="main">
            <Chat
              messages={chatMessages}
              meId={me?.participantId}
              participants={room.participants}
              actions={actions}
              onFocus={markChatRead}
              roomId={room.roomId}
              isChatRoom={true}
            />
          </main>
        </div>
      ) : (
        /* ============================================================
           STUDY ROOM EXPERIENCE (3 Columns)
           ============================================================ */
        <div className="room-layout__body">
          {/* Left column */}
          <aside className="room-layout__left">
            <ParticipantList participants={participants} hostId={room.hostId} />
            <FocusTimer focusSession={focusSession} isHost={isHost} actions={actions} />
            <GoalList goals={goals} meId={me?.participantId} hostId={room.hostId} actions={actions} />
          </aside>

          {/* Center Column */}
          <main className="room-layout__center" role="main">
            {!quizActive && (
              <div className="room-layout__tabs" role="tablist" aria-label="Workspace">
                {[
                  { id: 'notes', label: 'Notes' },
                  { id: 'whiteboard', label: 'Whiteboard' },
                  { id: 'code', label: 'Code' },
                ].map(({ id, label }) => (
                  <button
                    key={id}
                    type="button"
                    role="tab"
                    aria-selected={centerTab === id}
                    className={`room-layout__tab ${centerTab === id ? 'room-layout__tab--active' : ''}`}
                    onClick={() => setCenterTab(id)}
                  >
                    {label}
                  </button>
                ))}
                {quizState?.status === 'COMPLETED' && (
                  <span className="room-layout__quiz-badge text-label">Quiz complete</span>
                )}
              </div>
            )}

            <div className="room-layout__workspace">
              {effectiveCenterTab === 'notes' && (
                <StudyNotes initialContent={room.sharedNotes} actions={actions} />
              )}
              {effectiveCenterTab === 'whiteboard' && (
                <Whiteboard
                  initialStrokes={room.whiteboardState}
                  participantId={me?.participantId}
                  actions={actions}
                />
              )}
              {effectiveCenterTab === 'code' && (
                <CodeScratchpad initialCodeState={room.codeState} actions={actions} />
              )}
              {effectiveCenterTab === 'quiz' && (
                <Quiz
                  quizState={quizState}
                  meId={me?.participantId}
                  isHost={isHost}
                  actions={actions}
                  participants={participants}
                />
              )}
            </div>
          </main>

          {/* Right column — Chat */}
          <aside
            className={`room-layout__right ${focusSession?.status === 'FOCUSING' ? 'room-layout__right--dimmed' : ''}`}
          >
            <Chat
              messages={chatMessages}
              meId={me?.participantId}
              participants={room.participants}
              actions={actions}
              onFocus={markChatRead}
              roomId={room.roomId}
            />
          </aside>
        </div>
      )}

      {/* Tablet drawer */}
      {drawerOpen && (
        <div className="tablet-drawer-backdrop" onClick={() => setDrawerOpen(false)}>
          <div className="tablet-drawer glass-panel" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="tablet-drawer__close"
              onClick={() => setDrawerOpen(false)}
              aria-label="Close panel"
            >
              <X size={18} />
            </button>
            <ParticipantList participants={participants} hostId={room.hostId} />
            {!isChatMode && (
              <>
                <FocusTimer focusSession={focusSession} isHost={isHost} actions={actions} />
                <GoalList goals={goals} meId={me?.participantId} hostId={room.hostId} actions={actions} />
              </>
            )}
          </div>
        </div>
      )}

      {/* Mobile bottom tab bar */}
      <nav className="mobile-tab-bar" aria-label="Room navigation">
        {isChatMode
          ? [
              { id: 'chat', label: 'Chat', badge: unreadCount },
              { id: 'members', label: 'Members' },
            ].map(({ id, label, badge }) => (
              <button
                key={id}
                type="button"
                className={`mobile-tab-bar__btn ${mobileTab === id ? 'mobile-tab-bar__btn--active' : ''}`}
                onClick={() => {
                  setMobileTab(id);
                  if (id === 'chat') markChatRead();
                }}
                aria-label={label}
                aria-current={mobileTab === id ? 'page' : undefined}
              >
                <span className="mobile-tab-bar__label text-caption">{label}</span>
                {badge > 0 && (
                  <span className="mobile-tab-bar__badge text-caption">{badge > 9 ? '9+' : badge}</span>
                )}
              </button>
            ))
          : [
              { id: 'notes', label: 'Notes' },
              { id: 'whiteboard', label: 'Board' },
              { id: 'code', label: 'Code' },
              { id: 'chat', label: 'Chat', badge: unreadCount },
              { id: 'focus', label: 'Focus' },
              { id: 'goals', label: 'Goals' },
            ].map(({ id, label, badge }) => (
              <button
                key={id}
                type="button"
                className={`mobile-tab-bar__btn ${mobileTab === id ? 'mobile-tab-bar__btn--active' : ''}`}
                onClick={() => {
                  setMobileTab(id);
                  if (id === 'chat') markChatRead();
                }}
                aria-label={label}
                aria-current={mobileTab === id ? 'page' : undefined}
              >
                <span className="mobile-tab-bar__label text-caption">{label}</span>
                {badge > 0 && (
                  <span className="mobile-tab-bar__badge text-caption">{badge > 9 ? '9+' : badge}</span>
                )}
              </button>
            ))}
      </nav>

      {/* Mobile content */}
      <div className="mobile-content">
        {isChatMode ? (
          <>
            {mobileTab === 'chat' && (
              <Chat
                messages={chatMessages}
                meId={me?.participantId}
                participants={room.participants}
                actions={actions}
                onFocus={markChatRead}
                roomId={room.roomId}
                isChatRoom={true}
              />
            )}
            {mobileTab === 'members' && (
              <div style={{ padding: 'var(--space-4)', overflowY: 'auto' }}>
                <ParticipantList participants={participants} hostId={room.hostId} />
              </div>
            )}
          </>
        ) : (
          <>
            {mobileTab === 'notes' && <StudyNotes initialContent={room.sharedNotes} actions={actions} />}
            {mobileTab === 'whiteboard' && (
              <Whiteboard
                initialStrokes={room.whiteboardState}
                participantId={me?.participantId}
                actions={actions}
              />
            )}
            {mobileTab === 'code' && (
              <CodeScratchpad initialCodeState={room.codeState} actions={actions} />
            )}
            {mobileTab === 'chat' && (
              <Chat
                messages={chatMessages}
                meId={me?.participantId}
                participants={room.participants}
                actions={actions}
                onFocus={markChatRead}
                roomId={room.roomId}
              />
            )}
            {mobileTab === 'focus' && (
              <FocusTimer focusSession={focusSession} isHost={isHost} actions={actions} fullScreen />
            )}
            {mobileTab === 'goals' && (
              <GoalList goals={goals} meId={me?.participantId} hostId={room.hostId} actions={actions} />
            )}
          </>
        )}
      </div>
    </div>
  );
}
