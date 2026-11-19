import { useEffect, useId, useRef, useState } from 'react';
import './ToolbarMore.css';

export function ToolbarMore({ children }) {
  const [open, setOpen] = useState(false);
  const group = useRef(null);
  const toggle = useRef(null);
  const id = useId();

  useEffect(() => {
    if (!open) return;
    function dismiss(event) {
      if (!group.current?.contains(event.target)) setOpen(false);
    }
    document.addEventListener('pointerdown', dismiss);
    document.addEventListener('focusin', dismiss);
    return () => {
      document.removeEventListener('pointerdown', dismiss);
      document.removeEventListener('focusin', dismiss);
    };
  }, [open]);

  return (
    <div ref={group} className="toolbar-more" onKeyDown={event => {
      if (open && event.key === 'Escape') {
        setOpen(false);
        toggle.current?.focus();
      }
    }}>
      <button ref={toggle} type="button" className="toolbar-more__toggle" aria-expanded={open}
        aria-controls={id} onClick={() => setOpen(value => !value)}>More</button>
      <div id={id} className="toolbar-more__actions" data-open={open}>{children}</div>
    </div>
  );
}
