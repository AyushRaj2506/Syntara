/**
 * Format seconds as MM:SS (e.g. 3661 → "01:01:01" if >1h, else "61:01")
 * @param {number} totalSeconds
 * @returns {string}
 */
export function formatCountdown(totalSeconds) {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) {
    return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;
  }
  return `${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;
}

/**
 * Format epoch ms as a relative label (e.g. "2m", "just now")
 * @param {number} ms
 * @returns {string}
 */
export function relativeTime(ms) {
  const diff = Date.now() - ms;
  if (diff < 60_000)  return 'just now';
  if (diff < 3600_000) return `${Math.floor(diff / 60_000)}m`;
  if (diff < 86400_000) return `${Math.floor(diff / 3600_000)}h`;
  return `${Math.floor(diff / 86400_000)}d`;
}

/**
 * Format a room's expiry as a friendly "Xm left" string.
 * @param {number} expiresAt - epoch ms
 * @returns {string}
 */
export function formatExpiry(expiresAt) {
  const remaining = Math.max(0, expiresAt - Date.now());
  const totalMin = Math.ceil(remaining / 60_000);
  if (totalMin <= 0) return 'Ending…';
  if (totalMin < 60) return `${totalMin}m left`;
  return `${Math.floor(totalMin / 60)}h ${totalMin % 60}m left`;
}

/**
 * Validate room code format client-side.
 * @param {string} code
 * @returns {boolean}
 */
export function isValidRoomCode(code) {
  return /^[A-Z0-9]{2,5}-[A-Z0-9]{4,6}$/.test(code.toUpperCase());
}
