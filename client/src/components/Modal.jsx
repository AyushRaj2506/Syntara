import { useEffect, useRef, useCallback, useState } from 'react';
import { X } from 'lucide-react';
import { IconButton } from './IconButton';
import './Modal.css';

/**
 * Premium glass-surface modal with focus trap, ESC close, backdrop-click close, and animated exit.
 * @param {{
 *   open: boolean,
 *   onClose: () => void,
 *   title?: string,
 *   subtitle?: string,
 *   children: React.ReactNode,
 *   size?: 'sm'|'md'|'lg',
 *   closeOnBackdrop?: boolean,
 * }} props
 */
export function Modal({
  open,
  onClose,
  title,
  subtitle,
  children,
  size = 'md',
  closeOnBackdrop = true
}) {
  const panelRef = useRef(null);
  const lastFocusedRef = useRef(null);
  const onCloseRef = useRef(onClose);
  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  const [isRendered, setIsRendered] = useState(open);
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    if (open) {
      setIsRendered(true);
      setIsClosing(false);
    } else if (isRendered) {
      setIsClosing(true);
      const timer = setTimeout(() => {
        setIsRendered(false);
        setIsClosing(false);
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [open, isRendered]);

  const handleClose = useCallback(() => {
    if (isClosing) return;
    onCloseRef.current?.();
  }, [isClosing]);

  // Focus trap
  const trapFocus = useCallback((e) => {
    if (!panelRef.current) return;
    const focusable = panelRef.current.querySelectorAll(
      'button:not(:disabled), [href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])'
    );
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (e.key === 'Tab') {
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }
    if (e.key === 'Escape') {
      handleClose();
    }
  }, [handleClose]);

  useEffect(() => {
    if (open) {
      lastFocusedRef.current = document.activeElement;

      requestAnimationFrame(() => {
        if (panelRef.current && !panelRef.current.contains(document.activeElement)) {
          const firstInput = panelRef.current.querySelector('input:not(:disabled), textarea:not(:disabled)');
          const firstFocusable = firstInput || panelRef.current.querySelector(
            'button:not(:disabled), [href], select:not(:disabled), [tabindex]:not([tabindex="-1"])'
          );
          firstFocusable?.focus();
        }
      });

      document.addEventListener('keydown', trapFocus);
      document.body.style.overflow = 'hidden';
    } else {
      document.removeEventListener('keydown', trapFocus);
      document.body.style.overflow = '';
      if (lastFocusedRef.current && typeof lastFocusedRef.current.focus === 'function') {
        lastFocusedRef.current.focus();
      }
    }
    return () => {
      document.removeEventListener('keydown', trapFocus);
      document.body.style.overflow = '';
    };
  }, [open, trapFocus]);

  if (!isRendered) return null;

  return (
    <div
      className={`modal-backdrop ${isClosing ? 'modal-backdrop--closing' : ''}`}
      onClick={closeOnBackdrop ? handleClose : undefined}
      aria-hidden="true"
    >
      <div
        ref={panelRef}
        className={`modal-panel modal-panel--${size} ${isClosing ? 'modal-panel--closing' : ''}`}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
      >
        {title && (
          <div className="modal-panel__header">
            <div className="modal-panel__title-group">
              <h2 className="text-display-md modal-panel__title">{title}</h2>
              {subtitle && <p className="modal-panel__subtitle text-body-sm">{subtitle}</p>}
            </div>
            <IconButton aria-label="Close dialog" onClick={handleClose} size="sm">
              <X size={18} />
            </IconButton>
          </div>
        )}
        <div className="modal-panel__body">{children}</div>
      </div>
    </div>
  );
}
