import { useState, useRef, useEffect, useCallback } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import {
  ArrowDown,
  Smile,
  Send,
  Paperclip,
  X,
  FileText,
  FileSpreadsheet,
  FileCode,
  FileArchive,
  Download,
  ExternalLink,
  Loader2,
  File,
} from 'lucide-react';
import { SERVER_URL } from '../../../lib/socket';
import { relativeTime } from '../../../lib/formatters';
import './Chat.css';

const COMMON_EMOJI = ['😊', '😂', '👍', '❤️', '🔥', '💯', '🤔', '😮', '🎉', '👀', '✅', '❓', '😅', '🙏', '💪', '⭐'];

function formatBytes(bytes, decimals = 1) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
}

function getFileIcon(type, name = '') {
  if (type?.includes('pdf') || name.endsWith('.pdf')) return <FileText size={20} className="text-accent" />;
  if (type?.includes('spreadsheet') || type?.includes('excel') || name.match(/\.(xlsx|xls|csv)$/i))
    return <FileSpreadsheet size={20} className="text-success" />;
  if (name.match(/\.(zip|tar|gz|rar|7z)$/i)) return <FileArchive size={20} className="text-warning" />;
  if (name.match(/\.(js|jsx|ts|tsx|py|cpp|c|java|html|css|json)$/i))
    return <FileCode size={20} className="text-accent" />;
  return <File size={20} className="text-secondary" />;
}

/**
 * @param {{
 *   messages: object[],
 *   meId: string,
 *   participants: object,
 *   actions: object,
 *   onFocus?: () => void,
 *   roomId?: string,
 *   isChatRoom?: boolean,
 * }} props
 */
export function Chat({ messages, meId, participants, actions, onFocus, roomId, isChatRoom = false }) {
  const [text, setText] = useState('');
  const [showEmoji, setShowEmoji] = useState(false);
  const [atBottom, setAtBottom] = useState(true);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');

  const listRef = useRef(null);
  const inputRef = useRef(null);
  const fileInputRef = useRef(null);

  const virtualizer = useVirtualizer({
    count: messages.length,
    getScrollElement: () => listRef.current,
    estimateSize: () => 64,
    overscan: 10,
  });

  // Auto-scroll to bottom when new messages arrive and user is at bottom
  useEffect(() => {
    if (atBottom && listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages.length, atBottom]);

  const handleScroll = () => {
    if (!listRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = listRef.current;
    setAtBottom(scrollHeight - scrollTop - clientHeight < 60);
  };

  const scrollToBottom = () => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
      setAtBottom(true);
    }
  };

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError('');
    setSelectedFile(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeSelectedFile = () => {
    setSelectedFile(null);
    setUploadError('');
  };

  const send = useCallback(async () => {
    const trimmed = text.trim();
    if (!trimmed && !selectedFile) return;

    let uploadedFileData = undefined;

    if (selectedFile) {
      setUploading(true);
      setUploadError('');
      try {
        const formData = new FormData();
        // IMPORTANT: roomId MUST be appended before file so multer's
        // diskStorage destination callback can read req.body.roomId
        if (roomId) formData.append('roomId', roomId);
        formData.append('file', selectedFile);

        const res = await fetch(`${SERVER_URL}/api/upload`, {
          method: 'POST',
          body: formData,
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || 'Upload failed');
        }

        const data = await res.json();
        uploadedFileData = data.file;
      } catch (err) {
        setUploadError(err.message || 'Failed to upload file. Please try again.');
        setUploading(false);
        return;
      }
      setUploading(false);
      setSelectedFile(null);
    }

    // Pass undefined for text when empty (Zod .optional() requires undefined, not '')
    actions.sendChat(trimmed || undefined, uploadedFileData);
    setText('');
  }, [text, selectedFile, roomId, actions]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  const charCount = text.length;

  return (
    <div className={`chat ${isChatRoom ? 'chat--fullscreen' : ''}`} onClick={onFocus}>
      {!isChatRoom && (
        <div className="chat__header">
          <span className="text-label" style={{ color: 'var(--color-text-tertiary)' }}>Chat</span>
        </div>
      )}

      {/* Message list */}
      <div
        ref={listRef}
        className="chat__messages"
        aria-live="polite"
        aria-label="Chat messages"
        onScroll={handleScroll}
      >
        {messages.length === 0 && (
          <div className="chat__empty">
            <p className="text-body-sm text-tertiary">
              {isChatRoom
                ? 'Welcome to the chat room! Share messages, notes, and files here.'
                : 'No messages yet.'}
            </p>
          </div>
        )}
        <div style={{ height: `${virtualizer.getTotalSize()}px`, position: 'relative' }}>
          {virtualizer.getVirtualItems().map((vItem) => {
            const msg = messages[vItem.index];
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
                <ChatMessage msg={msg} meId={meId} participants={participants} />
              </div>
            );
          })}
        </div>
      </div>

      {/* New messages pill */}
      {!atBottom && (
        <button type="button" className="chat__new-pill" onClick={scrollToBottom}>
          <ArrowDown size={14} aria-hidden="true" />
          New messages
        </button>
      )}

      {/* Input area */}
      <div className="chat__input-area">
        {/* Selected file preview */}
        {selectedFile && (
          <div className="chat__file-preview-chip">
            <div className="chat__file-preview-info">
              {getFileIcon(selectedFile.type, selectedFile.name)}
              <div className="chat__file-preview-text">
                <span className="chat__file-preview-name text-body-sm font-medium">{selectedFile.name}</span>
                <span className="chat__file-preview-size text-caption text-tertiary">
                  {formatBytes(selectedFile.size)}
                </span>
              </div>
            </div>
            <button
              type="button"
              className="chat__file-preview-remove"
              onClick={removeSelectedFile}
              disabled={uploading}
              aria-label="Remove attachment"
            >
              <X size={14} />
            </button>
          </div>
        )}

        {uploadError && (
          <p className="chat__upload-error text-caption" role="alert">
            {uploadError}
          </p>
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

        <div className="chat__input-row">
          {/* File Attachment Button */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            style={{ display: 'none' }}
            id="chat-file-upload-input"
          />
          <button
            type="button"
            className="chat__attach-trigger"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            title="Attach file (PDF, images, videos, docs)"
            aria-label="Attach file"
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
            placeholder={selectedFile ? 'Add a caption…' : 'Message the room…'}
            value={text}
            maxLength={2000}
            rows={1}
            onChange={(e) => {
              setText(e.target.value);
              e.target.style.height = 'auto';
              e.target.style.height = Math.min(e.target.scrollHeight, 110) + 'px';
            }}
            onKeyDown={handleKeyDown}
            aria-label="Chat message"
            aria-multiline="true"
          />

          <button
            type="button"
            className="chat__send-btn"
            onClick={send}
            disabled={(!text.trim() && !selectedFile) || uploading}
            aria-label="Send message"
          >
            {uploading ? <Loader2 size={16} className="chat__spinner" /> : <Send size={16} aria-hidden="true" />}
          </button>
        </div>

        {charCount > 1800 && (
          <span className="chat__char-count text-caption" aria-live="polite">
            {2000 - charCount} left
          </span>
        )}
      </div>
    </div>
  );
}

/** Participant-hash-based name color */
const NAME_COLORS = ['#C0704A', '#5B8FBF', '#7B9E5A', '#A06BC0', '#BF7B5A', '#5A9E8F', '#C05A7B', '#8F8F5A'];
function nameColor(id) {
  let h = 0;
  for (let i = 0; i < (id?.length ?? 0); i++) h = (h << 5) - h + id.charCodeAt(i), h |= 0;
  return NAME_COLORS[Math.abs(h) % NAME_COLORS.length];
}

function ChatMessage({ msg, meId, participants }) {
  if (msg.type === 'system') {
    return (
      <div className="chat-msg chat-msg--system">
        <span className="text-caption">{msg.text}</span>
      </div>
    );
  }

  const isMine = msg.participantId === meId;
  const file = msg.file;
  const fileUrl = file?.url ? `${SERVER_URL}${file.url}` : '';

  const isImage = file?.fileType?.startsWith('image/');
  const isVideo = file?.fileType?.startsWith('video/');
  const isAudio = file?.fileType?.startsWith('audio/');

  return (
    <div className={`chat-msg ${isMine ? 'chat-msg--mine' : ''}`}>
      <div className="chat-msg__meta">
        <span className="chat-msg__name text-body-sm font-semibold" style={{ color: nameColor(msg.participantId) }}>
          {msg.displayName}
        </span>
        <span className="chat-msg__time text-caption">{relativeTime(msg.createdAt)}</span>
      </div>

      {/* Text body */}
      {msg.text && <p className="chat-msg__text text-body-md">{msg.text}</p>}

      {/* File Attachment render */}
      {file && (
        <div className="chat-msg__file">
          {isImage ? (
            <div className="chat-file-image-wrap">
              <a href={fileUrl} target="_blank" rel="noopener noreferrer">
                <img src={fileUrl} alt={file.fileName} className="chat-file-image" loading="lazy" />
              </a>
              <span className="chat-file-image-caption text-caption">
                {file.fileName} ({formatBytes(file.fileSize)})
              </span>
            </div>
          ) : isVideo ? (
            <div className="chat-file-video-wrap">
              <video src={fileUrl} controls preload="metadata" className="chat-file-video" />
              <span className="chat-file-caption text-caption">
                {file.fileName} ({formatBytes(file.fileSize)})
              </span>
            </div>
          ) : isAudio ? (
            <div className="chat-file-audio-wrap">
              <audio src={fileUrl} controls preload="metadata" className="chat-file-audio" />
              <span className="chat-file-caption text-caption">{file.fileName}</span>
            </div>
          ) : (
            <div className="chat-file-card">
              <div className="chat-file-card__icon">{getFileIcon(file.fileType, file.fileName)}</div>
              <div className="chat-file-card__details">
                <span className="chat-file-card__name text-body-sm font-medium">{file.fileName}</span>
                <span className="chat-file-card__size text-caption text-tertiary">{formatBytes(file.fileSize)}</span>
              </div>
              <div className="chat-file-card__actions">
                <a
                  href={fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="chat-file-action-btn"
                  title="Open in new tab"
                >
                  <ExternalLink size={14} />
                  <span>Open</span>
                </a>
                <a
                  href={fileUrl}
                  download={file.fileName}
                  className="chat-file-action-btn chat-file-action-btn--primary"
                  title="Download file"
                >
                  <Download size={14} />
                  <span>Download</span>
                </a>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
