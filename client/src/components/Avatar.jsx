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
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = ((hash << 5) - hash) + id.charCodeAt(i);
    hash |= 0;
  }
  return PALETTE[Math.abs(hash) % PALETTE.length];
}

/**
 * @param {string} name
 * @returns {string} up to 2-char initials
 */
function initials(name) {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

/**
 * Initials-based avatar with deterministic per-participant color.
 * @param {{
 *   name: string,
 *   participantId: string,
 *   size?: 'sm'|'md'|'lg',
 *   className?: string,
 * }} props
 */
export function Avatar({ name, participantId, size = 'md', className = '' }) {
  const bg = colorFromId(participantId);
  return (
    <div
      className={`avatar avatar--${size} ${className}`}
      style={{ backgroundColor: bg + '30', borderColor: bg + '60', color: bg }}
      aria-label={name}
      title={name}
    >
      {initials(name)}
    </div>
  );
}
