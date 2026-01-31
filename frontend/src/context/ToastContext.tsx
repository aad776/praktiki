import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

// Types
export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
}

interface ToastContextValue {
  toasts: Toast[];
  showToast: (message: string, type?: ToastType, duration?: number) => void;
  hideToast: (id: string) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  warning: (message: string) => void;
  info: (message: string) => void;
}

// Context
const ToastContext = createContext<ToastContextValue | undefined>(undefined);

// Generate unique ID
const generateId = () => Math.random().toString(36).substring(2, 9);

// Provider
export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const hideToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  const showToast = useCallback((message: string, type: ToastType = 'info', duration = 4000) => {
    const id = generateId();
    const toast: Toast = { id, type, message, duration };
    
    setToasts(prev => [...prev, toast]);
    
    // Auto remove after duration
    if (duration > 0) {
      setTimeout(() => {
        hideToast(id);
      }, duration);
    }
  }, [hideToast]);

  const success = useCallback((message: string) => showToast(message, 'success'), [showToast]);
  const error = useCallback((message: string) => showToast(message, 'error', 6000), [showToast]);
  const warning = useCallback((message: string) => showToast(message, 'warning'), [showToast]);
  const info = useCallback((message: string) => showToast(message, 'info'), [showToast]);

  return (
    <ToastContext.Provider value={{ toasts, showToast, hideToast, success, error, warning, info }}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={hideToast} />
    </ToastContext.Provider>
  );
}

// Toast Container Component
function ToastContainer({ toasts, onDismiss }: { toasts: Toast[]; onDismiss: (id: string) => void }) {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 max-w-sm">
      {toasts.map(toast => (
        <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

// Individual Toast Component
function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: (id: string) => void }) {
  const styles = {
    success: 'bg-emerald-50 border-emerald-200 text-emerald-800',
    error: 'bg-red-50 border-red-200 text-red-800',
    warning: 'bg-amber-50 border-amber-200 text-amber-800',
    info: 'bg-blue-50 border-blue-200 text-blue-800',
  };

  const icons = {
    success: '✓',
    error: '✕',
    warning: '⚠',
    info: 'ℹ',
  };

  return (
    <div
      className={`
        flex items-start gap-3 p-4 rounded-lg border shadow-lg
        animate-in slide-in-from-right duration-300
        ${styles[toast.type]}
      `}
      role="alert"
    >
      <span className="text-lg font-bold">{icons[toast.type]}</span>
      <p className="flex-1 text-sm font-medium">{toast.message}</p>
      <button
        onClick={() => onDismiss(toast.id)}
        className="text-current opacity-60 hover:opacity-100 transition-opacity"
        aria-label="Dismiss"
      >
        ×
      </button>
    </div>
  );
}

// Hook
export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
