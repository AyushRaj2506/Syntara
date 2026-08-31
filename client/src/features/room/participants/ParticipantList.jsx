import { useState, useRef, useEffect } from 'react';
import { Avatar } from '../../../components/Avatar';
import { Badge } from '../../../components/Badge';
import {
  Flame,
  Users,
  UserPlus,
  Link as LinkIcon,
  Check,
  Copy,
  X,
  MoreVertical,
  UserMinus,
} from 'lucide-react';
import './ParticipantList.css';

/**
 * @param {{
 *   participants: object[],
 *   hostId: string,
 *   meId?: string,
 *   isChatRoom?: boolean,
 *   roomCode?: string,
 *   expiresAt?: number,
 *   onRemove?: (participantId: string) => void,
 * }} props
 */
export function ParticipantList({
  participants,
  hostId,
  meId,
  isChatRoom = false,
  roomCode = '',
  expiresAt: _expiresAt,
  messageCount = 0,
  fileCount = 0,
  onRemove,
}) {
  const [copiedLink, setCopiedLink] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(false);
  const inviteRef = useRef(null);

  // Which participant's action menu is currently open (by participantId)
  const [openMenuId, setOpenMenuId] = useState(null);
  // Which participant is pending confirmation for removal
  const [confirmRemoveId, setConfirmRemoveId] = useState(null);
  const menuRef = useRef(null);

  const sorted = [...participants].sort((a, b) => {
    if (a.participantId === hostId) return -1;
    if (b.participantId === hostId) return 1;
    return a.joinedAt - b.joinedAt;
  });

  const onlineCount = participants.filter((p) => p.status === 'connected').length;

  const handleCopyLink = () => {
    const link = `${window.location.origin}/room/${roomCode || ''}`;
    navigator.clipboard.writeText(link).then(() => {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    });
  };

  // Close invite popover on outside click
  useEffect(() => {
    if (!inviteOpen) return;
    const handler = (e) => {
      if (inviteRef.current && !inviteRef.current.contains(e.target)) {
        setInviteOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [inviteOpen]);

  // Close participant action menu on outside click
  useEffect(() => {
    if (!openMenuId && !confirmRemoveId) return;
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpenMenuId(null);
        setConfirmRemoveId(null);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [openMenuId, confirmRemoveId]);

  const handleRemoveConfirmed = (participantId) => {
    onRemove?.(participantId);
    setConfirmRemoveId(null);
    setOpenMenuId(null);
  };

  // Host can remove: must have onRemove, must not be self, must not be the host
  const canRemove = (p) =>
    typeof onRemove === 'function' &&
    p.participantId !== meId &&
    p.participantId !== hostId;

  return (
    <div className={`participant-list ${isChatRoom ? 'participant-list--chat-mode' : ''}`}>

      {/* ── SECTION 1: PEOPLE ── */}
      <div className="collab-section">
        <div className="collab-section__label">
          <span className="collab-section__title">People</span>
          <span className="collab-section__count">{onlineCount}/{participants.length}</span>
        </div>

        <ul className="participant-list__items" role="list" aria-label="Participants in room">
          {sorted.map((p) => {
            const isHost = p.participantId === hostId;
            const isConnected = p.status === 'connected';
            const showActions = canRemove(p);
            const isMenuOpen = openMenuId === p.participantId;
            const isConfirming = confirmRemoveId === p.participantId;

            return (
              <li key={p.participantId} className="participant-row" role="listitem">
                <div className="participant-row__avatar-wrap">
                  <Avatar name={p.displayName} participantId={p.participantId} size="sm" single={true} />
                  <span
                    className={`participant-row__status-dot participant-row__status-dot--${p.status}`}
                    aria-label={p.status}
                  />
                </div>

                <div className="participant-row__info">
                  <div className="participant-row__name-row">
                    <span className="participant-row__name">{p.displayName}</span>
                    {isHost && <Badge variant="host">Host</Badge>}
                  </div>
                  {!isChatRoom && (
                    <div className="participant-row__activity-row">
                      {p.isFocusing && (
                        <Flame size={11} className="participant-row__focus-flame" aria-hidden="true" />
                      )}
                      <span
                        className={`participant-row__activity-text ${
                          p.isFocusing ? 'text-accent' : 'text-tertiary'
                        }`}
                      >
                        {p.isFocusing
                          ? 'In focus session'
                          : isHost
                          ? 'Host'
                          : isConnected
                          ? 'Active'
                          : 'Away'}
                      </span>
                    </div>
                  )}
                </div>

                {/* Host kick action — only shown to the host, for non-host non-self participants */}
                {showActions && (
                  <div className="participant-row__actions" ref={isMenuOpen || isConfirming ? menuRef : null}>
                    {isConfirming ? (
                      <div className="participant-kick-confirm">
                        <span className="participant-kick-confirm__label">Remove?</span>
                        <button
                          type="button"
                          className="participant-kick-confirm__yes"
                          onClick={() => handleRemoveConfirmed(p.participantId)}
                          aria-label={`Confirm remove ${p.displayName}`}
                        >
                          <Check size={11} />
                        </button>
                        <button
                          type="button"
                          className="participant-kick-confirm__no"
                          onClick={() => setConfirmRemoveId(null)}
                          aria-label="Cancel"
                        >
                          <X size={11} />
                        </button>
                      </div>
                    ) : (
                      <>
                        <button
                          type="button"
                          className="participant-row__menu-btn"
                          onClick={() => setOpenMenuId(isMenuOpen ? null : p.participantId)}
                          aria-label={`Actions for ${p.displayName}`}
                          aria-expanded={isMenuOpen}
                        >
                          <MoreVertical size={13} />
                        </button>
                        {isMenuOpen && (
                          <div className="participant-action-menu" role="menu">
                            <button
                              type="button"
                              className="participant-action-menu__item participant-action-menu__item--danger"
                              role="menuitem"
                              onClick={() => {
                                setOpenMenuId(null);
                                setConfirmRemoveId(p.participantId);
                              }}
                            >
                              <UserMinus size={12} />
                              <span>Remove participant</span>
                            </button>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>

        {!isChatRoom && participants.length <= 1 && (
          <div className="participant-list__empty">
            <Users size={14} className="text-tertiary" />
            <span className="text-caption text-tertiary">Waiting for study group…</span>
          </div>
        )}
      </div>

      {/* ── SECTION 2: QUICK ACTIONS (Chat Room only) ── */}
      {isChatRoom && (
        <div className="collab-section">
          <div className="collab-section__label">
            <span className="collab-section__title">Quick Actions</span>
          </div>

          <div className="quick-actions">
            {/* Invite button with popover */}
            <div className="quick-action-wrap" ref={inviteRef}>
              <button
                type="button"
                className="quick-action-btn"
                onClick={() => setInviteOpen(!inviteOpen)}
                aria-expanded={inviteOpen}
              >
                <UserPlus size={14} className="quick-action-btn__icon" />
                <span>Invite people</span>
              </button>

              {inviteOpen && (
                <div className="invite-popover" role="dialog" aria-label="Invite to room">
                  <div className="invite-popover__header">
                    <span className="invite-popover__title">Share this room</span>
                    <button
                      type="button"
                      className="invite-popover__close"
                      onClick={() => setInviteOpen(false)}
                      aria-label="Close"
                    >
                      <X size={13} />
                    </button>
                  </div>
                  <div className="invite-popover__link-row">
                    <code className="invite-popover__link-text">
                      {window.location.origin}/room/{roomCode}
                    </code>
                  </div>
                  <button
                    type="button"
                    className={`invite-popover__copy-btn ${copiedLink ? 'invite-popover__copy-btn--copied' : ''}`}
                    onClick={handleCopyLink}
                  >
                    {copiedLink ? <Check size={13} /> : <Copy size={13} />}
                    <span>{copiedLink ? 'Link copied!' : 'Copy room link'}</span>
                  </button>
                </div>
              )}
            </div>

            <button
              type="button"
              className="quick-action-btn"
              onClick={handleCopyLink}
            >
              {copiedLink ? <Check size={14} className="text-success" /> : <LinkIcon size={14} className="quick-action-btn__icon" />}
              <span>{copiedLink ? 'Copied!' : 'Share room link'}</span>
            </button>
          </div>
        </div>
      )}

      {/* ── SECTION 3: ROOM (Chat Room only) ── */}
      {isChatRoom && (
        <div className="collab-section">
          <div className="collab-section__label">
            <span className="collab-section__title">Room</span>
          </div>

          <div className="room-status-card">
            <div className="room-status-card__live">
              <span className="room-status-card__live-dot" />
              <span className="room-status-card__live-text">LIVE</span>
            </div>

            <p className="room-status-card__desc">
              General discussion
            </p>

            <p className="room-status-card__note">
              Private collaboration room
            </p>
          </div>
        </div>
      )}

      {/* ── SECTION 4: SESSION (Chat Room only) ── */}
      {isChatRoom && (
        <div className="collab-section">
          <div className="collab-section__label">
            <span className="collab-section__title">Session</span>
          </div>

          <div className="session-stats">
            <div className="session-stat-row">
              <span className="session-stat-label">Participants</span>
              <span className="session-stat-value">{participants.length}</span>
            </div>
            <div className="session-stat-row">
              <span className="session-stat-label">Messages</span>
              <span className="session-stat-value">{messageCount}</span>
            </div>
            <div className="session-stat-row">
              <span className="session-stat-label">Files</span>
              <span className="session-stat-value">{fileCount}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
