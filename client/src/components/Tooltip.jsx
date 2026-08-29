import { useState, useRef, useEffect } from 'react';
import './Tooltip.css';

/**
 * Hover/focus tooltip, 400ms delay.
 * @param {{
 *   content: string,
 *   children: React.ReactNode,
 *   placement?: 'top'|'bottom'|'left'|'right',
 * }} props
 */
export function Tooltip({ content, children, placement = 'top' }) {
  const [visible, setVisible] = useState(false);
  const timerRef = useRef(null);

  const show = () => {
    timerRef.current = setTimeout(() => setVisible(true), 400);
  };
  const hide = () => {
    clearTimeout(timerRef.current);
    setVisible(false);
  };

  useEffect(() => () => clearTimeout(timerRef.current), []);

  return (
    <span
      className="tooltip-wrapper"
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
    >
      {children}
      {visible && (
        <span className={`tooltip tooltip--${placement}`} role="tooltip">
          {content}
        </span>
      )}
    </span>
  );
}
