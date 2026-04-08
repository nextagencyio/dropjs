'use client';

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { CheckCircle2, CircleAlert, X, Info } from 'lucide-react';

type ToastType = 'success' | 'error' | 'info';

interface Toast {
  id: number;
  type: ToastType;
  message: string;
}

interface ToastContextValue {
  toast: (type: ToastType, message: string) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  info: (message: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

let toastId = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((type: ToastType, message: string) => {
    const id = ++toastId;
    setToasts((prev) => [...prev, { id, type, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 5000);
  }, []);

  const removeToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const value: ToastContextValue = {
    toast: addToast,
    success: useCallback((msg: string) => addToast('success', msg), [addToast]),
    error: useCallback((msg: string) => addToast('error', msg), [addToast]),
    info: useCallback((msg: string) => addToast('info', msg), [addToast]),
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      {/* Toast container */}
      {toasts.length > 0 && (
        <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 max-w-sm" role="alert">
          {toasts.map((t) => (
            <div
              key={t.id}
              className={`flex items-start gap-2.5 px-4 py-3 rounded-gin shadow-lg border text-sm animate-in slide-in-from-right-5 ${
                t.type === 'success'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                  : t.type === 'error'
                    ? 'bg-[#fef2f2] border-red-200 text-red-700'
                    : 'bg-blue-50 border-blue-200 text-blue-700'
              }`}
            >
              {t.type === 'success' && <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />}
              {t.type === 'error' && <CircleAlert className="w-4 h-4 mt-0.5 shrink-0" />}
              {t.type === 'info' && <Info className="w-4 h-4 mt-0.5 shrink-0" />}
              <span className="flex-1">{t.message}</span>
              <button
                onClick={() => removeToast(t.id)}
                className="shrink-0 p-0.5 rounded hover:bg-black/5 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);
  if (!context) {
    // Fallback if no provider — use browser alert
    return {
      toast: (_type, msg) => globalThis.alert?.(msg),
      success: (msg) => globalThis.alert?.(msg),
      error: (msg) => globalThis.alert?.(msg),
      info: (msg) => globalThis.alert?.(msg),
    };
  }
  return context;
}
