import { memo } from 'react';
import './Select.css';

/**
 * @param {{
 *   label?: string,
 *   error?: string,
 *   options: {value: string, label: string}[],
 *   className?: string,
 *   [key: string]: any
 * }} props
 */
export const Select = memo(function Select({ label, error, options, className = '', id, ...rest }) {
  return (
    <div className={`select-field ${className}`}>
      {label && <label className="select-field__label" htmlFor={id}>{label}</label>}
      <div className="select-field__wrapper">
        <select
          id={id}
          className={`select-field__control ${error ? 'select-field__control--error' : ''}`}
          {...rest}
        >
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
        <svg className="select-field__arrow" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </div>
      {error && <span className="select-field__error" role="alert">{error}</span>}
    </div>
  );
});

