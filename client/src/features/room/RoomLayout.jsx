import { useState, useEffect, useRef } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { X, FileText, Palette, Code2, MessageSquare, Flame, CheckSquare, Users, HelpCircle } from 'lucide-react';
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
import { useToast } from '../../hooks/useToast';
import { useConnectionState } from '../../hooks/useConnectionState';
import './RoomLayout.css';

/**
 * The full room workspace — adapts cleanly between Study Room and Chat Room modes.
 */
export function RoomLayout() {
  const { roomCode: paramCode } = useParams();
  const [searchParams] = useSearchParams();
  const queryCode = searchParams.get('room');
  const roomCode = (paramCode || queryCode || '').trim().toUpperCase();
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
  const [chosenTab, setMobileTab] = useState(null);
  const mobileTab = chosenTab ?? (isChatMode ? 'chat' : 'notes');

  // Tablet drawer
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Unread chat count
  const [lastReadId, setLastReadId] = useState(null);
  const latestId = chatMessages.at(-1)?.id;
  const unreadCount = mobileTab === 'chat' ? 0 :
    chatMessages.length - 1 - chatMessages.findIndex(message => message.id === lastReadId);
  const markChatRead = () => setLastReadId(latestId);
  const selectTab = id => {
    if (mobileTab === 'chat' || id === 'chat') markChatRead();
    setMobileTab(id);
  };

  const hasConnectedOnceRef = useRef(false);

  // Connection status toasts
  useEffect(() => {
    if (connectionStatus === 'connected' && room?.roomId) {
      if (hasConnectedOnceRef.current) {
        addToast({ message: 'Connection restored', type: 'success' });
      } else {
        hasConnectedOnceRef.current = true;
      }
    }
  }, [connectionStatus, room?.roomId, addToast]);

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

  const activeTab = quizActive ? 'quiz' : mobileTab;
  const tools = [
    { id: 'notes', label: 'Notes', icon: FileText },
    { id: 'whiteboard', label: 'Board', icon: Palette },
    { id: 'code', label: 'Code', icon: Code2 },
    { id: 'quiz', label: 'Quiz', icon: HelpCircle },
  ];
  const tabs = isChatMode
    ? [{ id: 'chat', label: 'Chat', icon: MessageSquare }, { id: 'members', label: 'People', icon: Users }]
    : [...tools, { id: 'chat', label: 'Chat', icon: MessageSquare }, { id: 'focus', label: 'Focus', icon: Flame }, { id: 'goals', label: 'Goals', icon: CheckSquare }];
  return (
    <div className={`room-layout ${isChatMode ? 'room-layout--chat-room' : ''} ${drawerOpen ? 'room-layout--drawer' : ''}`} data-mobile-tab={activeTab}>
      <RoomTopBar room={room} me={me} connectionStatus={connectionStatus}
        onOpenDrawer={() => { selectTab('members'); setDrawerOpen(v => !v); }}
        onLeave={() => { actions.leaveRoom(); navigate('/'); }} />
      <div className={`room-layout__body ${isChatMode ? 'room-layout__body--chat-only' : ''}`}>
        <aside className="room-layout__left" aria-label="Room tools">
          <button className="room-panel-close" onClick={() => setDrawerOpen(false)} aria-label="Close room tools"><X size={18} /></button>
          <div className="room-section room-section--members">
            <ParticipantList participants={participants} hostId={room.hostId} meId={me?.participantId}
              isChatRoom={isChatMode} roomCode={room.roomCode} expiresAt={room.expiresAt}
              messageCount={chatMessages.filter(m => m.type === 'user').length}
              fileCount={chatMessages.filter(m => m.file).length}
              onRemove={isHost ? actions.removeParticipant : undefined} />
          </div>
          {!isChatMode && <>
            <div className="room-section room-section--focus"><FocusTimer focusSession={focusSession} isHost={isHost} actions={actions} /></div>
            <div className="room-section room-section--goals"><GoalList goals={goals} meId={me?.participantId} hostId={room.hostId} actions={actions} /></div>
          </>}
          <div className="room-section room-section--activity"><LiveActivity isChatRoom={isChatMode} /></div>
        </aside>
        {!isChatMode && <main className="room-layout__center">
          <div className="room-layout__tabs-bar">
            <div className="room-layout__tabs" role="tablist" aria-label="Workspace tools">
              {tools.map(({ id, label, icon: Icon }) => <button key={id} role="tab" aria-selected={effectiveCenterTab === id}
                className={`room-layout__tab ${effectiveCenterTab === id ? 'room-layout__tab--active' : ''}`}
                disabled={quizActive && id !== 'quiz'}
                onClick={() => { setCenterTab(id); selectTab(id); }}><Icon size={15} />{label}</button>)}
            </div>
          </div>
          <div className="room-layout__workspace">
            {tools.map(({ id }) => <div key={id} data-tool={id}
              className={`room-workspace-pane ${effectiveCenterTab === id ? 'room-workspace-pane--active' : ''}`}>
              {id === 'notes' && <StudyNotes initialContent={room.sharedNotes} initialRevision={room.notesRevision || 0} actions={actions} />}
              {id === 'whiteboard' && <Whiteboard initialStrokes={room.whiteboardState} participantId={me?.participantId} actions={actions} />}
              {id === 'code' && <CodeScratchpad initialCodeState={room.codeState} actions={actions} />}
              {id === 'quiz' && <Quiz key={quizState ? quizState.quizId + '/' + quizState.currentIndex : 'draft'} quizState={quizState} meId={me?.participantId} isHost={isHost} actions={actions} participants={participants} />}
            </div>)}
          </div>
        </main>}
        <aside className={isChatMode ? 'room-layout__center room-layout__center--chat-mode room-chat-panel' : 'room-layout__right room-chat-panel'} aria-label="Room chat">
          <Chat messages={chatMessages} meId={me?.participantId} participants={room.participants} actions={actions}
            onFocus={markChatRead} roomId={room.roomCode} roomName={room.name} isChatRoom={isChatMode} />
        </aside>
      </div>
      <nav className="mobile-tab-bar" aria-label="Room navigation">
        {tabs.map(({ id, label, icon: Icon }) => <button key={id}
          className={`mobile-tab-bar__btn ${activeTab === id ? 'mobile-tab-bar__btn--active' : ''}`}
          disabled={quizActive && id !== 'quiz'}
          aria-current={activeTab === id ? 'page' : undefined}
          onClick={() => { selectTab(id); if (tools.some(t => t.id === id)) setCenterTab(id); }}>
          <Icon size={18} /><span className="mobile-tab-bar__label">{label}</span>
          {id === 'chat' && unreadCount > 0 && <span className="mobile-tab-bar__badge">{Math.min(99, unreadCount)}</span>}
        </button>)}
      </nav>
    </div>
  );
}
