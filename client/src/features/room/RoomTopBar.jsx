import { useState } from 'react';
import { Copy, Check, Users, MoreHorizontal, LogOut, Clock, ShieldCheck } from 'lucide-react';
import { BrandMark } from '../landing/BrandMark';
import { formatExpiry } from '../../lib/formatters';
import { ThemeToggle } from '../../components/ThemeToggle';
import './RoomTopBar.css';

/**
 * @param {{
 *   room: object,
 *   me: object,
 *   connectionStatus: string,
 *   onOpenDrawer: () => void,
 *   onLeave: () => void,
 * }} props
 */
export function RoomTopBar({ room, me: _me, connectionStatus, onOpenDrawer, onLeave }) {
  const [copied, setCopied] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  const copyCode = () => {
    navigator.clipboard.writeText(room.roomCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const connectedCount = Object.values(room.participants).filter(
    (p) => p.status === 'connected'
  ).length;

  const isChatRoom = room.type === 'CHAT';
  const isConnected = connectionStatus === 'connected';

  return (
    <header className="room-top-bar">
      {/* Left: Brand + Room metadata */}
      <div className="room-top-bar__left">
        {/* Tablet drawer trigger */}
        <button
          className="room-top-bar__drawer-btn"
          onClick={onOpenDrawer}
          aria-label="Open participants panel"
        >
          <Users size={16} />
        </button>

        <a href="/" className="room-top-bar__brand" aria-label="Syntara home">
          <BrandMark size={20} />
          <span className="room-top-bar__brand-title">Syntara</span>
        </a>

        <div className="room-top-bar__divider" />

        <div className="room-top-bar__room-info">
          <div className="room-top-bar__name-row">
            <h1 className="room-top-bar__name text-body-md font-semibold">{room.name}</h1>
            {isChatRoom ? (
              <span className="room-top-bar__mode-pill text-caption">Chat Room</span>
            ) : (
              <span className="room-top-bar__subject-pill text-caption">
                {room.customSubject || room.subject || 'General Study'}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Center: Interactive Room Code */}
      <div className="room-top-bar__center">
        <button
          className={`room-top-bar__code-pill ${copied ? 'room-top-bar__code-pill--copied' : ''}`}
          onClick={copyCode}
          aria-label={copied ? 'Code copied' : `Copy room code ${room.roomCode}`}
          title="Click to copy room code"
        >
          <span className="room-top-bar__code-label text-caption">CODE</span>
          <span className="room-top-bar__code-text text-mono font-bold">{room.roomCode}</span>
          <span className="room-top-bar__code-action" aria-hidden="true">
            {copied ? <Check size={13} className="text-success" /> : <Copy size={13} />}
          </span>
          {copied && <span className="room-top-bar__copied-tooltip text-caption">Copied!</span>}
        </button>
      </div>

      {/* Right: Live Presence, Status, Expiry, Theme & Menu */}
      <div className="room-top-bar__right">
        {/* Live presence counter */}
        <div className="room-top-bar__presence-badge" title={`${connectedCount} active in room`}>
          <span className="room-top-bar__presence-dot" />
          <span className="text-caption font-medium">
            {connectedCount} {isChatRoom ? (connectedCount === 1 ? 'participant' : 'participants') : 'studying'}
          </span>
        </div>

        {/* Connection status indicator */}
        <div
          className={`room-top-bar__conn-status room-top-bar__conn-status--${connectionStatus}`}
          title={isConnected ? 'Connected to real-time server' : `Status: ${connectionStatus}`}
        >
          <span className="room-top-bar__conn-dot" />
          <span className="room-top-bar__conn-text text-caption">
            {isConnected ? 'Connected' : connectionStatus}
          </span>
        </div>

        {/* Room expiry timer (Study Room only) */}
        {!isChatRoom && room.expiresAt && (
          <div className="room-top-bar__expiry" title="Session time remaining">
            <Clock size={12} className="room-top-bar__expiry-icon" />
            <span className="text-caption">{formatExpiry(room.expiresAt)}</span>
          </div>
        )}

        <ThemeToggle size="sm" />

        {/* Overflow Menu */}
        <div className="room-top-bar__menu-wrapper">
          <button
            className="room-top-bar__menu-btn"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Room menu"
            aria-expanded={menuOpen}
            aria-haspopup="true"
          >
            <MoreHorizontal size={16} />
          </button>
          {menuOpen && (
            <div
              className="room-top-bar__dropdown"
              role="menu"
              onMouseLeave={() => setMenuOpen(false)}
            >
              <div className="room-top-bar__dropdown-meta">
                <ShieldCheck size={13} className="text-accent" />
                <span className="text-caption text-secondary">Zero-retention room</span>
              </div>
              <div className="room-top-bar__dropdown-divider" />
              <button
                role="menuitem"
                className="room-top-bar__menu-item room-top-bar__menu-item--danger"
                onClick={() => {
                  setMenuOpen(false);
                  onLeave();
                }}
              >
                <LogOut size={14} aria-hidden="true" />
                Leave Room
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
