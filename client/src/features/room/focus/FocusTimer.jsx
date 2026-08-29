import { useState, useEffect } from 'react';
import { Play, Pause, Square, Flame, CheckCircle, Coffee } from 'lucide-react';
import { Button } from '../../../components/Button';
import { SegmentedControl } from '../../../components/SegmentedControl';
import { formatCountdown } from '../../../lib/formatters';
import './FocusTimer.css';

const DURATION_CHOICES = [
  { value: 25, label: '25m' },
  { value: 50, label: '50m' },
  { value: 90, label: '90m' },
];

/**
 * @param {{
 *   focusSession: object|null,
 *   isHost: boolean,
 *   actions: object,
 *   fullScreen?: boolean,
 * }} props
 */
export function FocusTimer({ focusSession, isHost, actions, fullScreen = false }) {
  const [selectedDuration, setSelectedDuration] = useState(25);
  const [secondsLeft, setSecondsLeft] = useState(0);

  const status = focusSession?.status ?? 'READY';

  // Server-authoritative timer countdown
  useEffect(() => {
    if (status !== 'FOCUSING' && status !== 'BREAK') return;
    if (!focusSession?.endsAt) return;

    const update = () => {
      const remainingMs = Math.max(0, focusSession.endsAt - Date.now());
      setSecondsLeft(Math.ceil(remainingMs / 1000));
    };

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [status, focusSession?.endsAt]);

  const handleStart = () => {
    actions.startFocus(selectedDuration);
  };

  const handlePause = () => {
    actions.pauseFocus();
  };

  const handleResume = () => {
    actions.resumeFocus();
  };

  const handleEnd = () => {
    actions.endFocus();
  };

  return (
    <div className={`focus-timer focus-timer--${status.toLowerCase()} ${fullScreen ? 'focus-timer--fullscreen' : ''}`}>
      {/* 1. READY STATE */}
      {status === 'READY' && (
        <div className="focus-card focus-card--ready">
          <div className="focus-card__header">
            <span className="text-label" style={{ color: 'var(--color-text-tertiary)' }}>Focus Session</span>
          </div>

          {isHost ? (
            <div className="focus-card__body">
              <SegmentedControl
                options={DURATION_CHOICES}
                value={selectedDuration}
                onChange={setSelectedDuration}
              />
              <Button
                variant="primary"
                size="md"
                fullWidth
                onClick={handleStart}
                className="focus-start-btn"
              >
                <Play size={16} fill="currentColor" /> Start Focus Session
              </Button>
            </div>
          ) : (
            <div className="focus-card__waiting">
              <span className="text-body-sm text-secondary">
                Waiting for host to start a focus session…
              </span>
            </div>
          )}
        </div>
      )}

      {/* 2. FOCUSING STATE */}
      {status === 'FOCUSING' && (
        <div className="focus-card focus-card--active">
          <div className="focus-card__header">
            <span className="focus-badge text-label">
              <Flame size={12} className="focus-flame" /> Focusing
            </span>
            <span className="text-caption text-secondary">
              {focusSession?.participantsAtStart || 1} studying
            </span>
          </div>

          <div className="focus-timer__digits text-display-lg" aria-live="polite">
            {formatCountdown(secondsLeft)}
          </div>

          {isHost && (
            <div className="focus-card__controls">
              <button
                className="focus-ctrl-btn"
                onClick={handlePause}
                title="Pause session"
                aria-label="Pause session"
              >
                <Pause size={16} />
              </button>
              <button
                className="focus-ctrl-btn focus-ctrl-btn--danger"
                onClick={handleEnd}
                title="End session early"
                aria-label="End session"
              >
                <Square size={16} />
              </button>
            </div>
          )}
        </div>
      )}

      {/* 3. BREAK STATE */}
      {status === 'BREAK' && (
        <div className="focus-card focus-card--break">
          <div className="focus-card__header">
            <span className="break-badge text-label">
              <Coffee size={12} /> Break Time
            </span>
          </div>

          <div className="focus-timer__digits text-display-lg text-success">
            {formatCountdown(secondsLeft)}
          </div>

          {isHost && (
            <div className="focus-card__controls">
              <Button size="sm" variant="secondary" onClick={handleEnd}>
                End Break
              </Button>
            </div>
          )}
        </div>
      )}

      {/* 4. COMPLETED STATE */}
      {status === 'COMPLETED' && (
        <div className="focus-card focus-card--completed" aria-live="assertive">
          <CheckCircle size={24} className="text-success" />
          <div className="focus-completed-text">
            <h4 className="text-heading-md" style={{ color: 'var(--color-text-primary)' }}>
              Focus Complete!
            </h4>
            <p className="text-body-sm text-secondary">
              {focusSession?.durationMin} minutes completed with {focusSession?.participantsAtStart || 1} students.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
