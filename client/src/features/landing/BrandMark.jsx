/**
 * Syntara "connected orbit" brand mark SVG.
 * Three dots (students) connected by arcs around a shared center point.
 *
 * @param {{ size?: number, opacity?: number, className?: string, animated?: boolean }} props
 */
export function BrandMark({ size = 24, opacity = 1, className = '', animated = false }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
      style={{ opacity }}
    >
      {/* Center point */}
      <circle cx="16" cy="16" r="2" fill="currentColor" />
      {/* Orbit ring */}
      <circle cx="16" cy="16" r="9" stroke="currentColor" strokeWidth="1" opacity="0.35" />
      {/* Three student dots on the orbit */}
      <circle cx="16" cy="7" r="2.5" fill="currentColor" />
      <circle cx="23.8" cy="20.5" r="2.5" fill="currentColor" />
      <circle cx="8.2" cy="20.5" r="2.5" fill="currentColor" />
      {/* Connecting arcs (thin lines from center to dots) */}
      <line x1="16" y1="16" x2="16" y2="9.5" stroke="currentColor" strokeWidth="0.8" opacity="0.5" />
      <line x1="16" y1="16" x2="22.3" y2="19.8" stroke="currentColor" strokeWidth="0.8" opacity="0.5" />
      <line x1="16" y1="16" x2="9.7" y2="19.8" stroke="currentColor" strokeWidth="0.8" opacity="0.5" />
      {animated && (
        <animateTransform
          attributeName="transform"
          type="rotate"
          from="0 16 16"
          to="360 16 16"
          dur="50s"
          repeatCount="indefinite"
        />
      )}
    </svg>
  );
}
