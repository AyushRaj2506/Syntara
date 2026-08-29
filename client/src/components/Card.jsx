import './Card.css';

/**
 * Flat surface container with optional hover elevation.
 * @param {{
 *   hoverable?: boolean,
 *   className?: string,
 *   children: React.ReactNode,
 *   [key: string]: any
 * }} props
 */
export function Card({ hoverable = false, className = '', children, ...rest }) {
  return (
    <div
      className={`card ${hoverable ? 'card--hoverable' : ''} ${className}`}
      {...rest}
    >
      {children}
    </div>
  );
}
