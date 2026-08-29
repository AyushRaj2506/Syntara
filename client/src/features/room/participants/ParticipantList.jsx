import { Avatar } from '../../../components/Avatar';
import { Badge } from '../../../components/Badge';
import { Flame } from 'lucide-react';
import './ParticipantList.css';

/**
 * @param {{
 *   participants: object[],
 *   hostId: string,
 * }} props
 */
export function ParticipantList({ participants, hostId }) {
  const sorted = [...participants].sort((a, b) => {
    if (a.participantId === hostId) return -1;
    if (b.participantId === hostId) return 1;
    return a.joinedAt - b.joinedAt;
  });

  return (
    <div className="participant-list">
      <div className="participant-list__header">
        <span className="text-label" style={{ color: 'var(--color-text-tertiary)' }}>Online</span>
        <span className="text-caption" style={{ color: 'var(--color-text-tertiary)' }}>
          {participants.filter(p => p.status === 'connected').length}/{participants.length}
        </span>
      </div>
      <ul className="participant-list__items" role="list" aria-label="Participants">
        {sorted.map((p) => (
          <li key={p.participantId} className="participant-row" role="listitem">
            <div className="participant-row__avatar-wrap">
              <Avatar name={p.displayName} participantId={p.participantId} size="sm" />
              <span
                className={`participant-row__status-dot participant-row__status-dot--${p.status}`}
                aria-label={p.status}
              />
            </div>
            <div className="participant-row__info">
              <span className="participant-row__name text-body-sm">{p.displayName}</span>
              <div className="participant-row__badges">
                {p.participantId === hostId && <Badge variant="host">Host</Badge>}
                {p.isFocusing && (
                  <Flame size={12} className="participant-row__focus-icon" aria-label="Focusing" />
                )}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
