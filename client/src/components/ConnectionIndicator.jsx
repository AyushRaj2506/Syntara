import './ConnectionIndicator.css';

/**
 * @param {{ status: 'connected'|'reconnecting'|'disconnected' }} props
 */
export function ConnectionIndicator({ status }) {
  const labels = {
    connected: 'Connected',
    reconnecting: 'Reconnecting…',
    disconnected: 'Disconnected',
  };
  return (
    <span className={`conn-indicator conn-indicator--${status}`} aria-live="polite" aria-label={`Connection status: ${labels[status]}`}>
      <span className="conn-indicator__dot" aria-hidden="true" />
      <span className="conn-indicator__label text-caption">{labels[status]}</span>
    </span>
  );
}
