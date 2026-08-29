import './Badge.css';

/**
 * @param {{
 *   variant?: 'default'|'host'|'online'|'accent'|'success'|'danger',
 *   children: React.ReactNode,
 *   className?: string,
 * }} props
 */
export function Badge({ variant = 'default', children, className = '' }) {
  return (
    <span className={`badge badge--${variant} text-label ${className}`}>
      {children}
    </span>
  );
}
