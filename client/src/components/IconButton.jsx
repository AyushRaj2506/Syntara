import './IconButton.css';

/**
 * Icon-only button. aria-label is REQUIRED.
 *
 * @param {{
 *   'aria-label': string,
 *   size?: 'sm'|'md'|'lg',
 *   variant?: 'ghost'|'surface'|'danger',
 *   active?: boolean,
 *   disabled?: boolean,
 *   children: React.ReactNode,
 *   className?: string,
 *   [key: string]: any
 * }} props
 */
export function IconButton({
  size = 'md',
  variant = 'ghost',
  active = false,
  disabled = false,
  children,
  className = '',
  ...rest
}) {
  return (
    <button
      className={`icon-btn icon-btn--${size} icon-btn--${variant} ${active ? 'icon-btn--active' : ''} ${className}`}
      disabled={disabled}
      {...rest}
    >
      {children}
    </button>
  );
}
