import { useState, useRef, useEffect, useCallback } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import {
  ArrowDown,
  Smile,
  Send,
  Paperclip,
  FileText,
  FileSpreadsheet,
  FileCode,
  FileArchive,
  Download,
  File,
  RotateCw,
  Check,
  AlertCircle,
  UploadCloud,
  MessageCircle,
  Sparkles,
  HelpCircle,
  Copy,
  Image as ImageIcon,
} from 'lucide-react';
import { socket, SERVER_URL } from '../../../lib/socket';
import { formatClockTime } from '../../../lib/formatters';
import { useWebRTCFileTransfer } from '../../../hooks/useWebRTCFileTransfer';
import { Avatar } from '../../../components/Avatar';
import { FileShareModal } from './FileShareModal';
import './Chat.css';

const COMMON_EMOJI = ['😊', '😂', '👍', '❤️', '🔥', '💯', '🤔', '😮', '🎉', '👀', '✅', '❓', '😅', '🙏', '💪', '⭐'];

function formatFileSize(bytes, decimals = 2) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  if (bytes < k) return `${bytes} B`;
  if (bytes < k * k) return `${(bytes / k).toFixed(dm)} KB`;
  return `${(bytes / (k * k)).toFixed(dm)} MB`;
}

function getFileIcon(type = '', name = '') {
  const n = name.toLowerCase();
  const t = type.toLowerCase();
  if (t.startsWith('image/')) return <ImageIcon size={18} className="file-msg-icon--image" />;
  if (t.includes('pdf') || n.endsWith('.pdf')) return <FileText size={18} className="file-msg-icon--pdf" />;
  if (t.includes('presentation') || t.includes('powerpoint') || n.match(/\.(pptx|ppt)$/i))
    return <FileText size={18} className="file-msg-icon--presentation" />;
  if (t.includes('spreadsheet') || t.includes('excel') || n.match(/\.(xlsx|xls|csv)$/i))
    return <FileSpreadsheet size={18} className="file-msg-icon--spreadsheet" />;
  if (n.match(/\.(zip|tar|gz|rar|7z)$/i)) return <FileArchive size={18} className="file-msg-icon--archive" />;
  if (n.match(/\.(js|jsx|ts|tsx|py|cpp|c|java|html|css|json|md)$/i))
    return <FileCode size={18} className="file-msg-icon--code" />;
  return <File size={18} className="file-msg-icon--generic" />;
}

/** Participant-hash-based name color */
const NAME_COLORS = ['#E8A33D', '#5B8FBF', '#6FBF8B', '#A06BC0', '#BF7B5A', '#5A9E8F', '#C05A7B', '#8F8F5A'];
function nameColor(id) {
  const str = String(id || 'syntara');
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h << 5) - h + str.charCodeAt(i);
    h |= 0;
  }
  return NAME_COLORS[Math.abs(h) % NAME_COLORS.length];
}

/**
 * @param {{
 *   messages: object[],
 *   meId: string,
 *   participants: object,
 *   actions: object,
 *   onFocus?: () => void,
 *   roomId?: string,
 *   roomName?: string,
 *   isChatRoom?: boolean,
 * }} props
 */
export function Chat({
  messages,
  meId,
  participants,
  actions,
  onFocus,
  roomId,
  roomName: _roomName,
  isChatRoom = false,
}) {
  const [text, setText] = useState('');
  const [showEmoji, setShowEmoji] = useState(false);
  const [atBottom, setAtBottom] = useState(true);
  const [unreadNewCount, setUnreadNewCount] = useState(0);
  const [transferError, setTransferError] = useState('');
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [droppedFiles, setDroppedFiles] = useState([]);
  const [isDragOverChat, setIsDragOverChat] = useState(false);
  const [typingUsers, setTypingUsers] = useState({});

  const listRef = useRef(null);
  const inputRef = useRef(null);
  const prevMessagesCountRef = useRef(messages.length);
  const typingTimerRef = useRef(null);

  // WebRTC P2P DataChannel file transfer hook
  const handleP2PFileReceived = useCallback((fileData) => {
    const msgId = fileData.transferId || crypto.randomUUID();
    const chatMsg = {
      id: msgId,
      type: 'user',
      participantId: fileData.senderParticipantId,
      displayName: fileData.senderDisplayName,
      text: fileData.caption || '',
      file: {
        fileId: msgId,
        fileName: fileData.fileName,
        fileSize: fileData.fileSize,
        fileType: fileData.fileType,
        url: fileData.url,
        isBlob: true,
      },
      createdAt: Date.now(),
    };
    actions.appendLocalMessage?.(chatMsg);
  }, [actions]);

  const { transfers, sendFile } = useWebRTCFileTransfer({
    roomId,
    myParticipantId: meId,
    participants,
    onFileReceived: handleP2PFileReceived,
  });

  const virtualizer = useVirtualizer({
    count: messages.length,
    getScrollElement: () => listRef.current,
    estimateSize: () => 76,
    overscan: 12,
  });

  // Typing event listener
  useEffect(() => {
    const handleTyping = ({ participantId, displayName, isTyping }) => {
      if (participantId === meId) return;
      setTypingUsers((prev) => {
        const next = { ...prev };
        if (isTyping) {
          next[participantId] = { displayName, time: Date.now() };
        } else {
          delete next[participantId];
        }
        return next;
      });
    };

    socket.on('chat:typing', handleTyping);

    const interval = setInterval(() => {
      const now = Date.now();
      setTypingUsers((prev) => {
        let changed = false;
        const next = {};
        for (const [id, user] of Object.entries(prev)) {
          if (now - user.time < 3000) {
            next[id] = user;
          } else {
            changed = true;
          }
        }
        return changed ? next : prev;
      });
    }, 2000);

    return () => {
      socket.off('chat:typing', handleTyping);
      clearInterval(interval);
    };
  }, [meId]);

  // Auto-scroll or unread counter
  useEffect(() => {
    const isNewMessage = messages.length > prevMessagesCountRef.current;
    if (isNewMessage) {
      if (atBottom && listRef.current) {
        listRef.current.scrollTop = listRef.current.scrollHeight;
      } else {
        setUnreadNewCount((prev) => prev + (messages.length - prevMessagesCountRef.current));
      }
    }
    prevMessagesCountRef.current = messages.length;
  }, [messages.length, atBottom]);

  const handleScroll = () => {
    if (!listRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = listRef.current;
    const isNearBottom = scrollHeight - scrollTop - clientHeight < 60;
    setAtBottom(isNearBottom);
    if (isNearBottom) {
      setUnreadNewCount(0);
    }
  };

  const scrollToBottom = () => {
    if (listRef.current) {
      listRef.current.scrollTo({
        top: listRef.current.scrollHeight,
        behavior: 'smooth',
      });
      setAtBottom(true);
      setUnreadNewCount(0);
    }
  };

  const handleSendFiles = async (filesToSend) => {
    setTransferError('');
    for (const file of filesToSend) {
      try {
        const messageId = crypto.randomUUID();
        const transferResult = await sendFile(file, '');
        const filePayload = {
          fileId: transferResult.transferId,
          fileName: file.name,
          fileSize: file.size,
          fileType: file.type || 'application/octet-stream',
          url: transferResult.url ? transferResult.url.replace(SERVER_URL, '') : undefined,
          fullUrl: transferResult.url,
        };
        actions.sendChat('', filePayload, messageId);
      } catch (err) {
        console.error('[chat] File send failed:', err);
        const errMsg = err?.message || 'Please retry.';
        setTransferError(`Failed to send "${file.name}": ${errMsg}`);
      }
    }
    scrollToBottom();
  };

  const emitTyping = (isTyping) => {
    socket.emit('chat:typing', { isTyping });
  };

  const handleTextChange = (e) => {
    const val = e.target.value;
    setText(val);
    e.target.style.height = 'auto';
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';

    if (val.trim()) {
      emitTyping(true);
      clearTimeout(typingTimerRef.current);
      typingTimerRef.current = setTimeout(() => {
        emitTyping(false);
      }, 2500);
    } else {
      emitTyping(false);
    }
  };

  const send = useCallback(() => {
    const trimmed = text.trim();
    if (!trimmed) return;

    clearTimeout(typingTimerRef.current);
    emitTyping(false);

    const messageId = crypto.randomUUID();
    actions.sendChat(trimmed, undefined, messageId);
    setText('');
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
    }
    scrollToBottom();
  }, [text, actions]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  // Drag & drop handlers on chat pane
  const handleChatDragOver = (e) => {
    e.preventDefault();
    setIsDragOverChat(true);
  };

  const handleChatDragLeave = () => {
    setIsDragOverChat(false);
  };

  const handleChatDrop = (e) => {
    e.preventDefault();
    setIsDragOverChat(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const files = Array.from(e.dataTransfer.files).map((f) => ({
        id: crypto.randomUUID(),
        file,
        name: f.name,
        size: f.size,
        type: f.type,
        previewUrl: f.type.startsWith('image/') ? URL.createObjectURL(f) : null,
      }));
      setDroppedFiles(files);
      setIsShareModalOpen(true);
    }
  };

  const onlineParticipantCount = Object.values(participants || {}).filter(
    (p) => p.status === 'connected'
  ).length;

  // Typing users summary string
  const typingList = Object.values(typingUsers);
  const typingSummary =
    typingList.length === 1
      ? `${typingList[0].displayName} is typing…`
      : typingList.length === 2
      ? `${typingList[0].displayName} and ${typingList[1].displayName} are typing…`
      : typingList.length > 2
      ? 'Several people are typing…'
      : '';

  return (
    <div
      className={`chat ${isChatRoom ? 'chat--fullscreen chat--chat-room-mode' : ''} ${
        isDragOverChat ? 'chat--dragover' : ''
      }`}
      onClick={onFocus}
      onDragOver={handleChatDragOver}
      onDragLeave={handleChatDragLeave}
      onDrop={handleChatDrop}
    >
      {/* Dedicated Internal Header in Chat Room Mode */}
      {isChatRoom ? (
        <div className="chat-internal-header">
          <div className="chat-internal-header__left">
            <div className="chat-internal-header__icon-box">
              <MessageCircle size={16} className="text-accent" />
            </div>
            <div className="chat-internal-header__titles">
              <h2 className="chat-internal-header__name">
                General Discussion
              </h2>
              <span className="chat-internal-header__sub">
                <span className="chat-internal-header__dot" />
                {onlineParticipantCount} {onlineParticipantCount === 1 ? 'participant active' : 'participants active'}
              </span>
            </div>
          </div>
          <div className="chat-internal-header__right">
            <span className="chat-internal-header__badge">
              Zero-retention
            </span>
          </div>
        </div>
      ) : (
        <div className="chat__header">
          <div className="chat__title-row">
            <span className="text-label text-tertiary">Chat</span>
            <span className="chat__msg-count text-caption font-semibold">{messages.length}</span>
          </div>
        </div>
      )}

      {/* Drag & Drop Overlay */}
      {isDragOverChat && (
        <div className="chat-drag-overlay" aria-hidden="true">
          <UploadCloud size={38} className="text-accent chat-drag-overlay__icon" />
          <span className="text-body-md font-semibold text-primary">Drop files here to share with the room</span>
          <span className="text-caption text-tertiary">P2P encrypted & zero-retention transfer</span>
        </div>
      )}

      {/* Central Conversation Shell */}
      <div className={`chat-conversation-container ${isChatRoom ? 'chat-conversation-container--chat-room' : ''}`}>
        {/* Message Timeline Area */}
        <div
          ref={listRef}
          className={`chat__messages ${isChatRoom ? 'chat__messages--chat-room' : ''}`}
          aria-live="polite"
          aria-label="Chat messages"
          onScroll={handleScroll}
        >
          <div
            className={`chat__timeline-wrapper ${isChatRoom ? 'chat__timeline-wrapper--centered' : ''}`}
            style={isChatRoom && messages.length > 0 && messages.length < 8
              ? { paddingTop: `${Math.max(0, (8 - messages.length) * 36)}px` }
              : undefined
            }
          >
            {messages.length === 0 && (
              <div className={`chat__empty ${isChatRoom ? 'chat__empty--chat-room' : ''}`}>
                <div className="chat__empty-glyph" aria-hidden="true">
                  <MessageCircle size={26} />
                </div>
                <div className="chat__empty-text">
                  <h3 className="chat__empty-title text-heading-sm font-semibold">Start the conversation</h3>
                  <p className="chat__empty-desc text-body-sm text-tertiary">
                    This room is ready for ideas, questions and direct P2P file sharing.
                  </p>
                </div>

                {/* Suggestion Starter Chips */}
                <div className="chat-suggestion-chips">
                  <button
                    type="button"
                    className="chat-suggestion-chip"
                    onClick={() => {
                      setText('Hey everyone, I had an idea about ');
                      inputRef.current?.focus();
                    }}
                  >
                    <Sparkles size={13} className="text-accent" />
                    <span>Share an idea</span>
                  </button>
                  <button
                    type="button"
                    className="chat-suggestion-chip"
                    onClick={() => {
                      setText('Quick question for the group: ');
                      inputRef.current?.focus();
                    }}
                  >
                    <HelpCircle size={13} className="text-accent" />
                    <span>Ask a question</span>
                  </button>
                  <button
                    type="button"
                    className="chat-suggestion-chip"
                    onClick={() => {
                      setDroppedFiles([]);
                      setIsShareModalOpen(true);
                    }}
                  >
                    <Paperclip size={13} className="text-accent" />
                    <span>Share a file</span>
                  </button>
                </div>
              </div>
            )}

            <div style={{ height: `${virtualizer.getTotalSize()}px`, position: 'relative' }}>
              {virtualizer.getVirtualItems().map((vItem) => {
                const msg = messages[vItem.index];
                const prevMsg = vItem.index > 0 ? messages[vItem.index - 1] : null;

                // Grouping logic: Same sender within 2 minutes and same type
                const isSameSender =
                  prevMsg &&
                  prevMsg.participantId === msg.participantId &&
                  prevMsg.type === msg.type &&
                  msg.createdAt - prevMsg.createdAt < 120000;

                return (
                  <div
                    key={vItem.key}
                    data-index={vItem.index}
                    ref={virtualizer.measureElement}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      transform: `translateY(${vItem.start}px)`,
                    }}
                  >
                    <ChatMessage
                      msg={msg}
                      meId={meId}
                      transfers={transfers}
                      isGrouped={isSameSender}
                      isChatRoom={isChatRoom}
                    />
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Active transfers drawer */}
        {Object.values(transfers).filter(
          (t) => t.status === 'SENDING' || t.status === 'RECEIVING' || t.status === 'PROGRESS'
        ).length > 0 && (
          <div className="chat__transfers-drawer">
            {Object.values(transfers)
              .filter((t) => t.status === 'SENDING' || t.status === 'RECEIVING' || t.status === 'PROGRESS')
              .map((t) => (
                <div key={t.id} className="chat__transfer-progress-card">
                  <div className="chat__transfer-info">
                    {getFileIcon(t.fileType, t.fileName)}
                    <div className="chat__transfer-details">
                      <span className="chat__transfer-name text-body-sm font-medium">{t.fileName}</span>
                      <span className="chat__transfer-meta text-caption text-tertiary">
                        {t.isSender ? 'Sending to room…' : `Receiving from ${t.senderDisplayName}…`} {t.progress}%
                      </span>
                    </div>
                  </div>
                  <div className="chat__transfer-bar">
                    <div className="chat__transfer-bar-fill" style={{ width: `${t.progress}%` }} />
                  </div>
                </div>
              ))}
          </div>
        )}

        {/* Floating New Messages Pill */}
        {!atBottom && (
          <button type="button" className="chat__new-pill" onClick={scrollToBottom}>
            <ArrowDown size={13} aria-hidden="true" />
            <span>{unreadNewCount > 0 ? `${unreadNewCount} new messages` : 'New messages'}</span>
          </button>
        )}

        {/* Floating Input Area / Composer */}
        <div className={`chat__input-area ${isChatRoom ? 'chat__input-area--chat-room' : ''}`}>
          {/* Real-time Typing Indicator */}
          {typingSummary && (
            <div className="chat__typing-bar" aria-live="polite">
              <div className="typing-dots" aria-hidden="true">
                <span className="typing-dot" />
                <span className="typing-dot" />
                <span className="typing-dot" />
              </div>
              <span className="chat__typing-text">{typingSummary}</span>
            </div>
          )}

          {transferError && (
            <div className="chat__transfer-error text-caption" role="alert">
              <AlertCircle size={14} />
              <span>{transferError}</span>
              <button
                type="button"
                className="chat__retry-btn"
                onClick={() => setTransferError('')}
              >
                <RotateCw size={12} /> Dismiss
              </button>
            </div>
          )}

          {showEmoji && (
            <div className="chat__emoji-picker" role="listbox" aria-label="Emoji picker">
              {COMMON_EMOJI.map((e) => (
                <button
                  key={e}
                  type="button"
                  className="chat__emoji-btn"
                  onClick={() => {
                    setText((t) => t + e);
                    setShowEmoji(false);
                    inputRef.current?.focus();
                  }}
                  aria-label={e}
                  role="option"
                >
                  {e}
                </button>
              ))}
            </div>
          )}

          <div className={`chat__composer-row ${isChatRoom ? 'chat__composer-row--chat-room' : ''}`}>
            {/* File Attachment Button -> Opens FileShareModal */}
            <button
              type="button"
              className="chat__attach-trigger"
              onClick={() => {
                setDroppedFiles([]);
                setIsShareModalOpen(true);
              }}
              title="Share files with the room"
              aria-label="Attach and share file"
            >
              <Paperclip size={18} />
            </button>

            {/* Emoji Picker Button */}
            <button
              type="button"
              className="chat__emoji-trigger"
              onClick={() => setShowEmoji(!showEmoji)}
              aria-label="Open emoji picker"
            >
              <Smile size={18} />
            </button>

            <textarea
              ref={inputRef}
              className="chat__textarea"
              placeholder="Message the room…"
              value={text}
              maxLength={2000}
              rows={1}
              onChange={handleTextChange}
              onKeyDown={handleKeyDown}
              aria-label="Chat message"
              aria-multiline="true"
            />

            <button
              type="button"
              className={`chat__send-btn ${text.trim() ? 'chat__send-btn--active' : ''}`}
              onClick={send}
              disabled={!text.trim()}
              aria-label="Send message"
            >
              <Send size={15} aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>

      {/* File Share Modal */}
      <FileShareModal
        isOpen={isShareModalOpen}
        onClose={() => {
          setIsShareModalOpen(false);
          setDroppedFiles([]);
        }}
        onSendFiles={handleSendFiles}
        initialFiles={droppedFiles}
      />
    </div>
  );
}

function ChatMessage({
  msg,
  meId,
  transfers = {},
  isGrouped,
  isChatRoom,
}) {
  const [copiedText, setCopiedText] = useState(false);

  // System Events (joins, leaves, room lifecycle)
  if (msg.type === 'system') {
    return (
      <div className="chat-system-divider">
        <span className="chat-system-line" />
        <span className="chat-system-pill text-caption">{msg.text}</span>
        <span className="chat-system-line" />
      </div>
    );
  }

  const isMine = msg.participantId === meId;
  const file = msg.file;
  const transfer = transfers?.[file?.fileId];
  const fileUrl =
    transfer?.url ||
    file?.fullUrl ||
    (file?.url
      ? file.url.startsWith('http') || file.url.startsWith('blob:')
        ? file.url
        : `${SERVER_URL}${file.url}`
      : '');

  const isImage = file?.fileType?.startsWith('image/');
  const isVideo = file?.fileType?.startsWith('video/');
  const isAudio = file?.fileType?.startsWith('audio/');

  const clockTime = formatClockTime(msg.createdAt);

  const handleCopy = () => {
    if (msg.text) {
      navigator.clipboard.writeText(msg.text).then(() => {
        setCopiedText(true);
        setTimeout(() => setCopiedText(false), 2000);
      });
    }
  };

  return (
    <div
      className={`chat-msg ${isMine ? 'chat-msg--mine' : 'chat-msg--peer'} ${
        isGrouped ? 'chat-msg--grouped' : ''
      } ${isChatRoom ? 'chat-msg--chat-room' : ''}`}
    >
      {/* Sender Meta Header (only shown for first message in a group) */}
      {!isGrouped && (
        <div className="chat-msg__meta">
          {!isMine && (
            <>
              <Avatar
                name={msg.displayName}
                participantId={msg.participantId}
                size="sm"
                single={true}
              />
              <span
                className="chat-msg__name text-caption font-semibold"
                style={{ color: nameColor(msg.participantId) }}
              >
                {msg.displayName}
              </span>
              <span className="chat-msg__time text-caption text-tertiary">
                {clockTime}
              </span>
            </>
          )}

          {isMine && (
            <>
              <span className="chat-msg__time text-caption text-tertiary">
                {clockTime}
              </span>
              <span className="chat-msg__name text-caption font-semibold chat-msg__name--mine">
                {msg.displayName || 'You'}
              </span>
              <Avatar
                name={msg.displayName || 'You'}
                participantId={msg.participantId}
                size="sm"
                single={true}
              />
            </>
          )}
        </div>
      )}

      {/* Message Bubble Wrapper with Hover Action */}
      <div className="chat-msg__bubble-wrap">
        <div className={`chat-msg__bubble ${file ? 'chat-msg__bubble--has-file' : ''}`}>
          {msg.text && <p className="chat-msg__text text-body-sm">{msg.text}</p>}

          {/* File Attachment Card inside bubble */}
          {file && (
            <div className="chat-msg__file">
              {isImage ? (
                <div className="chat-file-image-card">
                  <a href={fileUrl} target="_blank" rel="noopener noreferrer" className="chat-file-image-link">
                    <img src={fileUrl} alt={file.fileName} className="chat-file-image" loading="lazy" />
                  </a>
                  <div className="chat-file-image-footer">
                    <div className="chat-file-image-details">
                      <span className="chat-file-image-name" title={file.fileName}>
                        {file.fileName}
                      </span>
                      <span className="chat-file-image-size">
                        {formatFileSize(file.fileSize)}
                      </span>
                    </div>
                    {fileUrl && (
                      <a
                        href={fileUrl}
                        download={file.fileName}
                        className="chat-file-action-btn chat-file-action-btn--icon"
                        title="Download image"
                        aria-label="Download image"
                      >
                        <Download size={14} />
                      </a>
                    )}
                  </div>
                </div>
              ) : isVideo ? (
                <div className="chat-file-video-card">
                  <video src={fileUrl} controls preload="metadata" className="chat-file-video" />
                  <div className="chat-file-video-footer">
                    <span className="chat-file-video-name" title={file.fileName}>
                      {file.fileName} ({formatFileSize(file.fileSize)})
                    </span>
                    <a
                      href={fileUrl}
                      download={file.fileName}
                      className="chat-file-action-btn"
                      title="Download video"
                      aria-label="Download video"
                    >
                      <Download size={13} />
                    </a>
                  </div>
                </div>
              ) : isAudio ? (
                <div className="chat-file-audio-card">
                  <audio src={fileUrl} controls preload="metadata" className="chat-file-audio" />
                  <span className="chat-file-audio-name" title={file.fileName}>
                    {file.fileName}
                  </span>
                </div>
              ) : (
                <div className="chat-file-card">
                  <div className="chat-file-card__icon-box">
                    {getFileIcon(file.fileType, file.fileName)}
                  </div>

                  <div className="chat-file-card__details">
                    <span className="chat-file-card__name" title={file.fileName}>
                      {file.fileName}
                    </span>
                    <div className="chat-file-card__sub">
                      <span className="chat-file-card__size">
                        {formatFileSize(file.fileSize)}
                      </span>
                      <span className="chat-file-card__badge">
                        <Check size={11} className="text-success" />
                        {isMine ? 'Sent via P2P' : 'Received via P2P'}
                      </span>
                    </div>
                  </div>

                  <div className="chat-file-card__actions">
                    {fileUrl && (
                      <a
                        href={fileUrl}
                        download={file.fileName}
                        className="chat-file-download-btn"
                        title="Download file"
                        aria-label={`Download ${file.fileName}`}
                      >
                        <Download size={14} />
                      </a>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Message Hover Actions */}
        {msg.text && (
          <div className="chat-msg-actions" aria-hidden="true">
            <button
              type="button"
              className="chat-msg-action-btn"
              onClick={handleCopy}
              title={copiedText ? 'Copied!' : 'Copy message text'}
            >
              {copiedText ? <Check size={12} className="text-success" /> : <Copy size={12} />}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
