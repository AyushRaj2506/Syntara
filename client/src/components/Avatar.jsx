import './Avatar.css';

/** Deterministic color palette for participant avatars */
const PALETTE = [
  '#C0704A', '#5B8FBF', '#7B9E5A', '#A06BC0',
  '#BF7B5A', '#5A9E8F', '#C05A7B', '#8F8F5A',
];

/**
 * @param {string} id - participant id used to deterministically pick color
 * @returns {string} hex color
 */
function colorFromId(id) {
  const str = String(id || 'syntara');
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return PALETTE[Math.abs(hash) % PALETTE.length];
}

/**
 * @param {string} name
 * @returns {string} up to 2-char initials
 */
function initials(name, single = false) {
  const str = String(name || 'Guest').trim();
  if (!str) return 'G';
  if (single) return str.charAt(0).toUpperCase();
  const parts = str.split(/\s+/);
  if (parts.length >= 2 && isNaN(Number(parts[1]))) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return str.charAt(0).toUpperCase();
}

/**
 * Initials-based avatar with deterministic per-participant color.
 * @param {{
 *   name: string,
 *   participantId: string,
 *   size?: 'xs'|'sm'|'md'|'lg',
 *   single?: boolean,
 *   className?: string,
 * }} props
 */
export function Avatar({ name, participantId, size = 'md', single = false, className = '' }) {
  const bg = colorFromId(participantId);
  return (
    <div
      className={`avatar avatar--${size} ${className}`}
      style={{ backgroundColor: bg + '30', borderColor: bg + '60', color: bg }}
      aria-label={name}
      title={name}
    >
      {initials(name, single || size === 'xs')}
    </div>
  );
}
