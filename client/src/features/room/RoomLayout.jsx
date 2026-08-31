import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { X, FileText, Palette, Code2, MessageSquare, Flame, CheckSquare, Users, Clock } from 'lucide-react';
import { useRoom } from '../../hooks/useRoom';
import { RoomTopBar } from './RoomTopBar';
import { ParticipantList } from './participants/ParticipantList';
import { Chat } from './chat/Chat';
import { StudyNotes } from './notes/StudyNotes';
import { Whiteboard } from './whiteboard/Whiteboard';
import { CodeScratchpad } from './code/CodeScratchpad';
import { FocusTimer } from './focus/FocusTimer';
import { GoalList } from './goals/GoalList';
import { LiveActivity } from './activity/LiveActivity';
import { Quiz } from './quiz/Quiz';
import { useToast } from '../../components/Toast';
import { useConnectionState } from '../../hooks/useConnectionState';
import { formatExpiry } from '../../lib/formatters';
import './RoomLayout.css';

/**
 * The full room workspace — adapts cleanly between Study Room and Chat Room modes.
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
    joinError,
    chatMessages,
    goals,
    focusSession,
    quizState,
    actions,
  } = useRoom(roomCode, displayName);

  const connectionStatus = useConnectionState();

  // Center tab state for Study Rooms: 'notes' | 'whiteboard' | 'code'
  const [centerTab, setCenterTab] = useState('notes');

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

  const hasConnectedOnceRef = useRef(false);

  // Connection status toasts
  useEffect(() => {
    if (connectionStatus === 'connected' && room) {
      if (hasConnectedOnceRef.current) {
        addToast({ message: 'Connection restored', type: 'success' });
      } else {
        hasConnectedOnceRef.current = true;
      }
    }
  }, [connectionStatus]); // eslint-disable-line

  // Expiry warning (5 min - Study Room only)
  useEffect(() => {
    if (!room || isChatMode) return;
    const remaining = room.expiresAt - Date.now();
    if (remaining > 5 * 60 * 1000) {
      const t = setTimeout(() => {
        addToast({ message: 'This room ends in 5 minutes', type: 'info', duration: 6000 });
      }, remaining - 5 * 60 * 1000);
      return () => clearTimeout(t);
    }
  }, [room?.expiresAt, isChatMode]); // eslint-disable-line

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

  // Join error state (ROOM_NOT_FOUND, ROOM_EXPIRED, ROOM_FULL, etc.)
  // This replaces the infinite loading spinner that was the previous behavior.
  if (joinError) {
    const errorTitle =
      joinError.code === 'ROOM_NOT_FOUND' ? 'Room not found' :
      joinError.code === 'ROOM_EXPIRED'   ? 'Room has ended' :
      joinError.code === 'ROOM_FULL'      ? 'Room is full' :
      'Could not join room';
    const errorMsg =
      joinError.code === 'ROOM_NOT_FOUND'
        ? 'This room no longer exists. It may have ended after all participants left, or the link may be incorrect.'
        : joinError.message || 'An error occurred joining the room.';
    return (
      <div className="room-ended">
        <h2 className="text-heading-lg font-bold">{errorTitle}</h2>
        <p className="text-body-md" style={{ color: 'var(--color-text-secondary)', maxWidth: '380px', textAlign: 'center' }}>
          {errorMsg}
        </p>
        <button type="button" className="room-ended__btn font-semibold" onClick={() => navigate('/')}>
          Return Home
        </button>
      </div>
    );
  }

  // Room ended state
  if (room?._closed) {
    const endedMsg =
      room._closed === 'expired'
        ? 'The session time ran out.'
        : room._closed === 'removed'
        ? room._removedMessage || 'You were removed from this room by the host.'
        : 'All participants left the room.';
    return (
      <div className="room-ended">
        <h2 className="text-heading-lg font-bold">
          {room._closed === 'removed' ? 'Removed from room' : 'This room has ended.'}
        </h2>
        <p className="text-body-md" style={{ color: 'var(--color-text-secondary)' }}>
          {endedMsg}
        </p>
        <button type="button" className="room-ended__btn font-semibold" onClick={() => navigate('/')}>
          Return Home
        </button>
      </div>
    );
  }

  if (!room) {
    return (
      <div className="room-loading">
        <div className="room-loading__spinner" aria-label="Loading room…" />
        <p className="text-body-sm" style={{ color: 'var(--color-text-tertiary)' }}>
          Joining room…
        </p>
      </div>
    );
  }

  const isHost = me?.isHost ?? false;
  const participants = Object.values(room.participants);
  const quizActive = quizState && quizState.status === 'IN_PROGRESS';
  const effectiveCenterTab = quizActive ? 'quiz' : centerTab;

  return (
    <div
      className={`room-layout ${
        focusSession?.status === 'FOCUSING' && !isChatMode ? 'room-layout--focusing' : ''
      } ${isChatMode ? 'room-layout--chat-room' : ''}`}
    >
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
          CHAT ROOM EXPERIENCE (2-Column Dedicated Chat Layout)
          ============================================================ */}
      {isChatMode ? (
        <div className="room-layout__body room-layout__body--chat-only">
          {/* Left sidebar: Collaboration Panel */}
          <aside className="room-layout__left room-layout__left--chat-mode room-layout__sidebar-panel">
            <ParticipantList
              participants={participants}
              hostId={room.hostId}
              meId={me?.participantId}
              isChatRoom={true}
              roomCode={room.roomCode}
              expiresAt={room.expiresAt}
              messageCount={chatMessages.filter(m => m.type === 'user').length}
              fileCount={chatMessages.filter(m => m.type === 'user' && m.file).length}
              onRemove={isHost ? actions.removeParticipant : undefined}
            />
            <LiveActivity isChatRoom={true} />
          </aside>

          {/* Main workspace: Full-width Chat */}
          <main className="room-layout__center room-layout__center--chat-mode" role="main">
            <Chat
              messages={chatMessages}
              meId={me?.participantId}
              participants={room.participants}
              actions={actions}
              onFocus={markChatRead}
              roomId={room.roomCode}
              roomName={room.name}
              isChatRoom={true}
            />
          </main>
        </div>
      ) : (
        /* ============================================================
           STUDY ROOM EXPERIENCE (3 Columns)
           ============================================================ */
        <div className="room-layout__body">
          {/* Left column: People, Focus, Goals, Activity */}
          <aside className="room-layout__left">
            <ParticipantList
              participants={participants}
              hostId={room.hostId}
              meId={me?.participantId}
              isChatRoom={false}
              roomCode={room.roomCode}
              onRemove={isHost ? actions.removeParticipant : undefined}
            />
            <FocusTimer focusSession={focusSession} isHost={isHost} actions={actions} />
            <GoalList goals={goals} meId={me?.participantId} hostId={room.hostId} actions={actions} />
            <LiveActivity isChatRoom={false} />
          </aside>

          {/* Center Column: Primary Workspace */}
          <main className="room-layout__center" role="main">
            {!quizActive && (
              <div className="room-layout__tabs-bar">
                <div className="room-layout__tabs" role="tablist" aria-label="Workspace tool switcher">
                  {[
                    { id: 'notes', label: 'Notes', icon: FileText },
                    { id: 'whiteboard', label: 'Whiteboard', icon: Palette },
                    { id: 'code', label: 'Code', icon: Code2 },
                  ].map(({ id, label, icon: Icon }) => (
                    <button
                      key={id}
                      type="button"
                      role="tab"
                      aria-selected={centerTab === id}
                      className={`room-layout__tab ${centerTab === id ? 'room-layout__tab--active' : ''}`}
                      onClick={() => setCenterTab(id)}
                    >
                      <Icon size={14} className="room-layout__tab-icon" />
                      <span>{label}</span>
                    </button>
                  ))}
                </div>

                {quizState?.status === 'COMPLETED' && (
                  <span className="room-layout__quiz-badge text-label">Quiz complete</span>
                )}
              </div>
            )}

            <div className="room-layout__workspace">
              <div
                className={`room-workspace-pane ${effectiveCenterTab === 'notes' ? 'room-workspace-pane--active' : ''}`}
                aria-hidden={effectiveCenterTab !== 'notes'}
              >
                <StudyNotes initialContent={room.sharedNotes} actions={actions} />
              </div>
              <div
                className={`room-workspace-pane ${effectiveCenterTab === 'whiteboard' ? 'room-workspace-pane--active' : ''}`}
                aria-hidden={effectiveCenterTab !== 'whiteboard'}
              >
                <Whiteboard
                  initialStrokes={room.whiteboardState}
                  participantId={me?.participantId}
                  actions={actions}
                />
              </div>
              <div
                className={`room-workspace-pane ${effectiveCenterTab === 'code' ? 'room-workspace-pane--active' : ''}`}
                aria-hidden={effectiveCenterTab !== 'code'}
              >
                <CodeScratchpad initialCodeState={room.codeState} actions={actions} />
              </div>
              {quizState && (
                <div
                  className={`room-workspace-pane ${effectiveCenterTab === 'quiz' ? 'room-workspace-pane--active' : ''}`}
                  aria-hidden={effectiveCenterTab !== 'quiz'}
                >
                  <Quiz
                    quizState={quizState}
                    meId={me?.participantId}
                    isHost={isHost}
                    actions={actions}
                    participants={participants}
                  />
                </div>
              )}
            </div>
          </main>

          {/* Right column: Chat & P2P File Sharing */}
          <aside
            className={`room-layout__right ${focusSession?.status === 'FOCUSING' ? 'room-layout__right--dimmed' : ''}`}
          >
            <Chat
              messages={chatMessages}
              meId={me?.participantId}
              participants={room.participants}
              actions={actions}
              onFocus={markChatRead}
              roomId={room.roomCode}
            />
          </aside>
        </div>
      )}

      {/* Tablet drawer */}
      {drawerOpen && (
        <div className="tablet-drawer-backdrop" onClick={() => setDrawerOpen(false)}>
          <div className="tablet-drawer" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="tablet-drawer__close"
              onClick={() => setDrawerOpen(false)}
              aria-label="Close panel"
            >
              <X size={18} />
            </button>
            <ParticipantList
              participants={participants}
              hostId={room.hostId}
              meId={me?.participantId}
              isChatRoom={isChatMode}
              roomCode={room.roomCode}
              onRemove={isHost ? actions.removeParticipant : undefined}
            />
            {isChatMode ? (
              <>
                <div className="chat-room-info-card">
                  <div className="chat-room-info-card__header">
                    <span className="text-label text-tertiary">Room Info</span>
                    <span className="chat-room-info-card__badge text-caption">
                      <Clock size={11} /> {formatExpiry(room.expiresAt)}
                    </span>
                  </div>
                  <p className="text-body-sm font-semibold text-primary mt-1">
                    Temporary collaboration room
                  </p>
                  <p className="text-caption text-tertiary mt-1">
                    Messages and shared files expire when the room ends.
                  </p>
                </div>
                <LiveActivity isChatRoom={true} />
              </>
            ) : (
              <>
                <FocusTimer focusSession={focusSession} isHost={isHost} actions={actions} />
                <GoalList goals={goals} meId={me?.participantId} hostId={room.hostId} actions={actions} />
                <LiveActivity isChatRoom={false} />
              </>
            )}
          </div>
        </div>
      )}

      {/* Mobile bottom tab bar */}
      <nav className="mobile-tab-bar" aria-label="Room navigation">
        {isChatMode
          ? [
              { id: 'chat', label: 'Chat', icon: MessageSquare, badge: unreadCount },
              { id: 'members', label: 'Members', icon: Users },
            ].map(({ id, label, icon: Icon, badge }) => (
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
                <Icon size={16} />
                <span className="mobile-tab-bar__label text-caption">{label}</span>
                {badge > 0 && (
                  <span className="mobile-tab-bar__badge text-caption">{badge > 9 ? '9+' : badge}</span>
                )}
              </button>
            ))
          : [
              { id: 'notes', label: 'Notes', icon: FileText },
              { id: 'whiteboard', label: 'Board', icon: Palette },
              { id: 'code', label: 'Code', icon: Code2 },
              { id: 'chat', label: 'Chat', icon: MessageSquare, badge: unreadCount },
              { id: 'focus', label: 'Focus', icon: Flame },
              { id: 'goals', label: 'Goals', icon: CheckSquare },
            ].map(({ id, label, icon: Icon, badge }) => (
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
                <Icon size={16} />
                <span className="mobile-tab-bar__label text-caption">{label}</span>
                {badge > 0 && (
                  <span className="mobile-tab-bar__badge text-caption">{badge > 9 ? '9+' : badge}</span>
                )}
              </button>
            ))}
      </nav>

      {/* Mobile content — persistent panes */}
      <div className="mobile-content">
        {isChatMode ? (
          <>
            <div
              className={`mobile-pane ${mobileTab === 'chat' ? 'mobile-pane--active' : ''}`}
              aria-hidden={mobileTab !== 'chat'}
            >
              <Chat
                messages={chatMessages}
                meId={me?.participantId}
                participants={room.participants}
                actions={actions}
                onFocus={markChatRead}
                roomId={room.roomCode}
                isChatRoom={true}
              />
            </div>
            <div
              className={`mobile-pane ${mobileTab === 'members' ? 'mobile-pane--active' : ''}`}
              aria-hidden={mobileTab !== 'members'}
              style={{ overflowY: 'auto', padding: 'var(--space-3)' }}
            >
              <ParticipantList
                participants={participants}
                hostId={room.hostId}
                meId={me?.participantId}
                isChatRoom={true}
                roomCode={room.roomCode}
                onRemove={isHost ? actions.removeParticipant : undefined}
              />
              <div className="chat-room-info-card mt-3">
                <div className="chat-room-info-card__header">
                  <span className="text-label text-tertiary">Room Info</span>
                  <span className="chat-room-info-card__badge text-caption">
                    <Clock size={11} /> {formatExpiry(room.expiresAt)}
                  </span>
                </div>
                <p className="text-body-sm font-semibold text-primary mt-1">
                  Temporary collaboration room
                </p>
                <p className="text-caption text-tertiary mt-1">
                  Messages and shared files expire when the room ends.
                </p>
              </div>
            </div>
          </>
        ) : (
          <>
            <div
              className={`mobile-pane ${mobileTab === 'notes' ? 'mobile-pane--active' : ''}`}
              aria-hidden={mobileTab !== 'notes'}
            >
              <StudyNotes initialContent={room.sharedNotes} actions={actions} />
            </div>
            <div
              className={`mobile-pane ${mobileTab === 'whiteboard' ? 'mobile-pane--active' : ''}`}
              aria-hidden={mobileTab !== 'whiteboard'}
            >
              <Whiteboard
                initialStrokes={room.whiteboardState}
                participantId={me?.participantId}
                actions={actions}
              />
            </div>
            <div
              className={`mobile-pane ${mobileTab === 'code' ? 'mobile-pane--active' : ''}`}
              aria-hidden={mobileTab !== 'code'}
            >
              <CodeScratchpad initialCodeState={room.codeState} actions={actions} />
            </div>
            <div
              className={`mobile-pane ${mobileTab === 'chat' ? 'mobile-pane--active' : ''}`}
              aria-hidden={mobileTab !== 'chat'}
            >
              <Chat
                messages={chatMessages}
                meId={me?.participantId}
                participants={room.participants}
                actions={actions}
                onFocus={markChatRead}
                roomId={room.roomCode}
              />
            </div>
            <div
              className={`mobile-pane ${mobileTab === 'focus' ? 'mobile-pane--active' : ''}`}
              aria-hidden={mobileTab !== 'focus'}
            >
              <FocusTimer focusSession={focusSession} isHost={isHost} actions={actions} fullScreen />
            </div>
            <div
              className={`mobile-pane ${mobileTab === 'goals' ? 'mobile-pane--active' : ''}`}
              aria-hidden={mobileTab !== 'goals'}
            >
              <GoalList goals={goals} meId={me?.participantId} hostId={room.hostId} actions={actions} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
