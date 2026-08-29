import { useState } from 'react';
import { Copy, Check, Users, MoreHorizontal, LogOut } from 'lucide-react';
import { BrandMark } from '../landing/BrandMark';
import { ConnectionIndicator } from '../../components/ConnectionIndicator';
import { Badge } from '../../components/Badge';
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
export function RoomTopBar({ room, me, connectionStatus, onOpenDrawer, onLeave }) {
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

  return (
    <header className="room-top-bar">
      {/* Brand + room info */}
      <div className="room-top-bar__left">
        {/* Tablet: drawer trigger */}
        <button
          className="room-top-bar__drawer-btn"
          onClick={onOpenDrawer}
          aria-label="Open participants panel"
        >
          <Users size={18} />
        </button>

        <a href="/" className="room-top-bar__brand" aria-label="Syntara home">
          <BrandMark size={20} />
        </a>

        <div className="room-top-bar__room-info">
          <div className="room-top-bar__name-row">
            <span className="room-top-bar__name text-heading-md">{room.name}</span>
            {isChatRoom && (
              <span className="room-top-bar__mode-pill text-caption">Chat Room</span>
            )}
          </div>
          <span className="room-top-bar__subject text-caption">
            {isChatRoom ? 'Casual Chat & Files' : (room.customSubject || room.subject)}
          </span>
        </div>
      </div>

      {/* Center — room code */}
      <div className="room-top-bar__center">
        <button
          className="room-top-bar__code"
          onClick={copyCode}
          aria-label={copied ? 'Code copied' : `Copy room code ${room.roomCode}`}
          title="Click to copy room code"
        >
          <span className="room-top-bar__code-text">{room.roomCode}</span>
          <span className="room-top-bar__code-icon" aria-hidden="true">
            {copied ? <Check size={14} /> : <Copy size={14} />}
          </span>
        </button>
      </div>

      {/* Right — status indicators */}
      <div className="room-top-bar__right">
        <Badge variant="online">{connectedCount} online</Badge>
        <ConnectionIndicator status={connectionStatus} />
        <span className="room-top-bar__expiry text-caption">{formatExpiry(room.expiresAt)}</span>
        <ThemeToggle size="sm" />

        {/* Overflow menu */}
        <div className="room-top-bar__menu-wrapper">
          <button
            className="room-top-bar__menu-btn"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Room menu"
            aria-expanded={menuOpen}
            aria-haspopup="true"
          >
            <MoreHorizontal size={18} />
          </button>
          {menuOpen && (
            <div
              className="room-top-bar__dropdown"
              role="menu"
              onMouseLeave={() => setMenuOpen(false)}
            >
              <button
                role="menuitem"
                className="room-top-bar__menu-item room-top-bar__menu-item--danger"
                onClick={() => { setMenuOpen(false); onLeave(); }}
              >
                <LogOut size={15} aria-hidden="true" />
                Leave Room
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
