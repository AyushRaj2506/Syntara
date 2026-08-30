/**
 * Syntara "connected orbit" brand mark SVG.
 * Three collaborative student nodes connected by orbital geometry around a shared focus center.
 *
 * @param {{ size?: number, opacity?: number, className?: string, animated?: boolean, interactive?: boolean }} props
 */
export function BrandMark({ size = 24, opacity = 1, className = '', animated = false, interactive = false }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`brand-mark ${animated ? 'brand-mark--animated' : ''} ${interactive ? 'brand-mark--interactive' : ''} ${className}`}
      aria-hidden="true"
      style={{ opacity, display: 'inline-block', verticalAlign: 'middle' }}
    >
      {/* Outer subtle guide ring */}
      <circle
        cx="16"
        cy="16"
        r="13"
        stroke="currentColor"
        strokeWidth="0.75"
        strokeDasharray="2 3"
        opacity="0.2"
      />

      {/* Main Orbit ring */}
      <circle
        cx="16"
        cy="16"
        r="9"
        stroke="currentColor"
        strokeWidth="1.25"
        opacity="0.4"
      />

      {/* Connecting spokes from center to nodes */}
      <line x1="16" y1="16" x2="16" y2="7" stroke="currentColor" strokeWidth="1" opacity="0.45" />
      <line x1="16" y1="16" x2="23.8" y2="20.5" stroke="currentColor" strokeWidth="1" opacity="0.45" />
      <line x1="16" y1="16" x2="8.2" y2="20.5" stroke="currentColor" strokeWidth="1" opacity="0.45" />

      {/* Center focus core */}
      <circle cx="16" cy="16" r="2.5" fill="currentColor" />

      {/* Orbit student nodes */}
      <g className="brand-mark__nodes">
        <circle cx="16" cy="7" r="2.75" fill="currentColor" />
        <circle cx="23.8" cy="20.5" r="2.75" fill="currentColor" />
        <circle cx="8.2" cy="20.5" r="2.75" fill="currentColor" />
      </g>
    </svg>
  );
}
