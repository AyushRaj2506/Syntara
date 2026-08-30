import { useState, useEffect } from 'react';
import { Activity, Flame, CheckCircle, UserPlus, UserMinus, FileUp } from 'lucide-react';
import { socket } from '../../../lib/socket';
import { relativeTime } from '../../../lib/formatters';
import './LiveActivity.css';

/**
 * Live Activity Feed — displays real room events in real time.
 * Always renders (shows empty state if no events yet).
 * @param {{
 *   isChatRoom?: boolean,
 * }} props
 */
export function LiveActivity({ isChatRoom = false }) {
  const [events, setEvents] = useState([]);

  useEffect(() => {
    const addEvent = (event) => {
      setEvents((prev) => [
        { id: crypto.randomUUID(), ...event, timestamp: Date.now() },
        ...prev.slice(0, 19), // keep max 20 recent events
      ]);
    };

    const handleJoin = ({ participant }) => {
      addEvent({
        type: 'join',
        icon: UserPlus,
        text: `${participant.displayName} joined`,
      });
    };

    const handleLeave = () => {
      addEvent({
        type: 'leave',
        icon: UserMinus,
        text: `Participant left`,
      });
    };

    const handleFocusStart = ({ focusSession }) => {
      if (isChatRoom) return;
      addEvent({
        type: 'focus',
        icon: Flame,
        text: `Focus sprint started (${focusSession?.durationMin || 25}m)`,
      });
    };

    const handleGoalUpdate = ({ goal }) => {
      if (isChatRoom) return;
      if (goal.completed) {
        addEvent({
          type: 'goal',
          icon: CheckCircle,
          text: `Goal completed: "${goal.text.length > 25 ? goal.text.slice(0, 25) + '…' : goal.text}"`,
        });
      }
    };

    const handleChatMessage = ({ message }) => {
      if (message.file) {
        addEvent({
          type: 'file',
          icon: FileUp,
          text: `${message.displayName} shared ${message.file.fileName}`,
        });
      }
    };

    socket.on('participant:join', handleJoin);
    socket.on('participant:leave', handleLeave);
    socket.on('focus:start', handleFocusStart);
    socket.on('goal:update', handleGoalUpdate);
    socket.on('chat:message', handleChatMessage);

    return () => {
      socket.off('participant:join', handleJoin);
      socket.off('participant:leave', handleLeave);
      socket.off('focus:start', handleFocusStart);
      socket.off('goal:update', handleGoalUpdate);
      socket.off('chat:message', handleChatMessage);
    };
  }, [isChatRoom]);

  return (
    <div className="live-activity">
      <div className="live-activity__header">
        <span className="collab-section__title">Recent Activity</span>
        <Activity size={12} className="text-accent" />
      </div>

      {events.length === 0 ? (
        <p className="live-activity__empty">Activity will appear here</p>
      ) : (
        <div className="live-activity__list">
          {events.slice(0, 5).map((evt) => {
            const Icon = evt.icon;
            return (
              <div key={evt.id} className="live-activity__item">
                <Icon size={11} className="live-activity__icon" />
                <div className="live-activity__content">
                  <span className="live-activity__text">{evt.text}</span>
                  <span className="live-activity__time">{relativeTime(evt.timestamp)}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
