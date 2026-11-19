import { createContext, useContext } from 'react';

/** @type {React.Context<{addToast: (toast: object) => void}>} */
export const ToastContext = createContext(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}

