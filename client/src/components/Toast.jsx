import { createContext, useContext, useCallback, useRef, useState } from 'react';
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';
import './Toast.css';

/** @type {React.Context<{addToast: (toast: object) => void}>} */
const ToastContext = createContext(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}

/**
 * @param {{ children: React.ReactNode }} props
 */
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timersRef = useRef({});

  const removeToast = useCallback((id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
    clearTimeout(timersRef.current[id]);
    delete timersRef.current[id];
  }, []);

  const addToast = useCallback(({ message, type = 'info', duration = 3500 }) => {
    const id = String(Date.now() + Math.random());
    setToasts((prev) => [...prev.slice(-4), { id, message, type }]);
    if (duration > 0) {
      timersRef.current[id] = setTimeout(() => removeToast(id), duration);
    }
  }, [removeToast]);

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <div
        className="toast-container"
        aria-live="polite"
        aria-atomic="false"
        role="region"
        aria-label="Notifications"
      >
        {toasts.map((toast) => (
          <Toast key={toast.id} {...toast} onDismiss={removeToast} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

const ICONS = {
  info:    <Info size={16} />,
  success: <CheckCircle size={16} />,
  error:   <AlertCircle size={16} />,
};

function Toast({ id, message, type, onDismiss }) {
  return (
    <div className={`toast toast--${type}`} role="status">
      <span className="toast__icon" aria-hidden="true">{ICONS[type] ?? ICONS.info}</span>
      <span className="toast__message text-body-sm">{message}</span>
      <button
        className="toast__close"
        onClick={() => onDismiss(id)}
        aria-label="Dismiss notification"
      >
        <X size={14} />
      </button>
    </div>
  );
}
