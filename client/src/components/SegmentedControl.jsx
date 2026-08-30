import { memo, useRef } from 'react';
import './SegmentedControl.css';

/**
 * Segmented control with roving tabindex and arrow-key navigation.
 * @param {{
 *   options: {value: string|number, label: string}[],
 *   value: string|number,
 *   onChange: (value: string|number) => void,
 *   label?: string,
 *   className?: string,
 * }} props
 */
export const SegmentedControl = memo(function SegmentedControl({ options, value, onChange, label, className = '' }) {
  const groupRef = useRef(null);

  const handleKeyDown = (e, idx) => {
    let next = idx;
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      next = (idx + 1) % options.length;
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      next = (idx - 1 + options.length) % options.length;
    } else {
      return;
    }
    onChange(options[next].value);
    groupRef.current?.querySelectorAll('[role="radio"]')[next]?.focus();
  };

  return (
    <div className={`seg-control ${className}`}>
      {label && <span className="seg-control__label">{label}</span>}
      <div
        ref={groupRef}
        role="radiogroup"
        aria-label={label}
        className="seg-control__group"
      >
        {options.map((opt, idx) => {
          const selected = opt.value === value;
          return (
            <button
              key={opt.value}
              type="button"
              role="radio"
              aria-checked={selected}
              tabIndex={selected ? 0 : -1}
              className={`seg-control__option ${selected ? 'seg-control__option--selected' : ''}`}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => onChange(opt.value)}
              onKeyDown={(e) => handleKeyDown(e, idx)}
            >
              {opt.label}
            </button>
          );
        })}
      </div>
    </div>
  );
});

