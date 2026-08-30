import { Loader2 } from 'lucide-react';
import './Button.css';

/**
 * Primary/secondary/ghost/danger button with loading + disabled states.
 *
 * @param {{
 *   variant?: 'primary'|'secondary'|'ghost'|'danger',
 *   size?: 'sm'|'md'|'lg',
 *   loading?: boolean,
 *   disabled?: boolean,
 *   fullWidth?: boolean,
 *   children: React.ReactNode,
 *   className?: string,
 *   [key: string]: any
 * }} props
 */
export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  fullWidth = false,
  children,
  className = '',
  ...rest
}) {
  return (
    <button
      className={`btn btn--${variant} btn--${size} ${fullWidth ? 'btn--full' : ''} ${className}`}
      disabled={disabled || loading}
      aria-busy={loading}
      {...rest}
    >
      {loading && <Loader2 className="btn__spinner" aria-hidden="true" />}
      <span className={`btn__content ${loading ? 'btn__label--loading' : ''}`}>{children}</span>
    </button>
  );
}
