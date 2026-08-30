import { useState, useEffect } from 'react';
import { Play, Pause, Square, Flame, CheckCircle, Coffee, RotateCcw } from 'lucide-react';
import { Button } from '../../../components/Button';
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

  // Calculate progress percentage
  const totalSeconds = (focusSession?.durationMin || selectedDuration) * 60;
  const elapsedSeconds = Math.max(0, totalSeconds - secondsLeft);
  const progressPercent = totalSeconds > 0 ? Math.min(100, Math.round((elapsedSeconds / totalSeconds) * 100)) : 0;

  return (
    <div className={`focus-timer focus-timer--${status.toLowerCase()} ${fullScreen ? 'focus-timer--fullscreen' : ''}`}>
      {/* 1. READY STATE */}
      {status === 'READY' && (
        <div className="focus-card focus-card--ready">
          <div className="focus-card__header">
            <span className="text-label text-tertiary">Focus Sprint</span>
          </div>

          <div className="focus-card__body">
            {isHost ? (
              <>
                <div className="focus-duration-chips" role="group" aria-label="Select focus duration">
                  {DURATION_CHOICES.map(({ value, label }) => (
                    <button
                      key={value}
                      type="button"
                      className={`focus-chip ${selectedDuration === value ? 'focus-chip--selected' : ''}`}
                      onClick={() => setSelectedDuration(value)}
                    >
                      {label}
                    </button>
                  ))}
                </div>

                <p className="focus-card__prompt text-caption text-secondary">Ready when you are.</p>

                <Button
                  variant="primary"
                  size="md"
                  fullWidth
                  onClick={handleStart}
                  className="focus-start-btn"
                >
                  <Play size={14} fill="currentColor" />
                  <span>Start Focus</span>
                </Button>
              </>
            ) : (
              <div className="focus-card__waiting">
                <p className="text-caption text-secondary">Waiting for host to start a focus session…</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 2. FOCUSING OR PAUSED STATE */}
      {(status === 'FOCUSING' || status === 'PAUSED') && (
        <div className="focus-card focus-card--active">
          <div className="focus-card__header">
            <span className="focus-badge text-label">
              <Flame size={12} className="focus-flame" /> {status === 'PAUSED' ? 'Focus Paused' : 'Focus Sprint'}
            </span>
            <span className="focus-participant-count text-caption font-medium">
              ● {focusSession?.participantsAtStart || 1} focusing together
            </span>
          </div>

          <div className="focus-card__timer-display">
            <div className="focus-timer__digits text-display-lg font-mono font-bold" aria-live="polite">
              {formatCountdown(secondsLeft)}
            </div>
            <span className="focus-timer__subtitle text-caption text-secondary">
              {status === 'PAUSED' ? 'Session paused' : 'Deep work in progress'}
            </span>
          </div>

          {/* Progress Bar */}
          <div className="focus-progress-track">
            <div className="focus-progress-bar" style={{ width: `${progressPercent}%` }} />
          </div>

          {isHost && (
            <div className="focus-card__controls">
              {status === 'PAUSED' ? (
                <button
                  type="button"
                  className="focus-ctrl-btn"
                  onClick={handleResume}
                  title="Resume session"
                  aria-label="Resume focus session"
                >
                  <Play size={14} />
                  <span>Resume</span>
                </button>
              ) : (
                <button
                  type="button"
                  className="focus-ctrl-btn"
                  onClick={handlePause}
                  title="Pause session"
                  aria-label="Pause focus session"
                >
                  <Pause size={14} />
                  <span>Pause</span>
                </button>
              )}
              <button
                type="button"
                className="focus-ctrl-btn focus-ctrl-btn--danger"
                onClick={handleEnd}
                title="End session"
                aria-label="End focus session"
              >
                <Square size={14} />
                <span>End</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* 3. BREAK STATE */}
      {status === 'BREAK' && (
        <div className="focus-card focus-card--break">
          <div className="focus-card__header">
            <span className="break-badge text-label text-success">
              <Coffee size={12} /> Break Time
            </span>
          </div>

          <div className="focus-timer__digits text-display-lg text-success font-mono font-bold">
            {formatCountdown(secondsLeft)}
          </div>
          <span className="focus-timer__subtitle text-caption text-secondary">Recharge for the next round</span>

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
          <div className="focus-card__completed-header">
            <CheckCircle size={20} className="text-success" />
            <h4 className="text-body-sm font-semibold text-primary">Focus Sprint Complete!</h4>
          </div>
          <p className="text-caption text-secondary">
            {focusSession?.durationMin}m completed with {focusSession?.participantsAtStart || 1} peer(s).
          </p>
          {isHost && (
            <button type="button" className="focus-reset-btn text-caption text-accent" onClick={handleEnd}>
              <RotateCcw size={12} /> New Sprint
            </button>
          )}
        </div>
      )}
    </div>
  );
}
