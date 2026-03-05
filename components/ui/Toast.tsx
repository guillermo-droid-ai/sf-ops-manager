'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { X, CheckCircle, AlertTriangle } from 'lucide-react';
import clsx from 'clsx';

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error';
}

interface ToastContextValue {
  showToast: (message: string, type: 'success' | 'error') => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}

interface ToastProviderProps {
  children: ReactNode;
}

export function ToastProvider({ children }: ToastProviderProps) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = useCallback((message: string, type: 'success' | 'error') => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    setToasts((prev) => [...prev, { id, message, type }]);

    // Auto-dismiss after 3 seconds
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  }, []);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {/* Toast container */}
      <div className="fixed top-4 right-4 z-[100] flex flex-col gap-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={clsx(
              'flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg min-w-[300px] animate-slide-in',
              toast.type === 'success' && 'bg-green-900/90 border border-green-600',
              toast.type === 'error' && 'bg-red-900/90 border border-red-600'
            )}
          >
            {toast.type === 'success' ? (
              <CheckCircle className="h-5 w-5 text-green-400 flex-shrink-0" />
            ) : (
              <AlertTriangle className="h-5 w-5 text-red-400 flex-shrink-0" />
            )}
            <p
              className={clsx(
                'flex-1 text-sm',
                toast.type === 'success' && 'text-green-100',
                toast.type === 'error' && 'text-red-100'
              )}
            >
              {toast.message}
            </p>
            <button
              onClick={() => dismiss(toast.id)}
              className={clsx(
                'p-1 rounded hover:bg-white/10',
                toast.type === 'success' && 'text-green-300',
                toast.type === 'error' && 'text-red-300'
              )}
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
      <style jsx global>{`
        @keyframes slide-in {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        .animate-slide-in {
          animation: slide-in 0.2s ease-out;
        }
      `}</style>
    </ToastContext.Provider>
  );
}
