import { forwardRef, memo } from 'react';
import './Input.css';

/**
 * @param {{
 *   label?: string,
 *   error?: string,
 *   hint?: string,
 *   className?: string,
 *   [key: string]: any
 * }} props
 */
export const Input = memo(forwardRef(function Input({ label, error, hint, className = '', id, ...rest }, ref) {
  return (
    <div className={`input-field ${className}`}>
      {label && <label className="input-field__label" htmlFor={id}>{label}</label>}
      <input
        id={id}
        ref={ref}
        className={`input-field__control ${error ? 'input-field__control--error' : ''}`}
        {...rest}
      />
      {error && <span className="input-field__error" role="alert">{error}</span>}
      {hint && !error && <span className="input-field__hint">{hint}</span>}
    </div>
  );
}));

