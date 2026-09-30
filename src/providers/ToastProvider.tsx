import { CircleAlert, CircleCheck, Info, X } from 'lucide-react';
import type { ReactNode } from 'react';
import { createContext, useCallback, useContext, useState } from 'react';
import { cn } from '@/lib/utils';

export type ToastType = 'success' | 'error' | 'info';

export interface ToastItem {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
}

interface ToastContextType {
  toast: (options: {
    type?: ToastType;
    title: string;
    message?: string;
    duration?: number;
  }) => void;
  success: (title: string, message?: string) => void;
  error: (title: string, message?: string) => void;
  info: (title: string, message?: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    ({
      type = 'info',
      title,
      message,
      duration = 4000,
    }: {
      type?: ToastType;
      title: string;
      message?: string;
      duration?: number;
    }) => {
      const id = Math.random().toString(36).substring(2, 9);
      setToasts((prev) => [...prev, { id, type, title, message }]);
      if (duration > 0) {
        setTimeout(() => removeToast(id), duration);
      }
    },
    [removeToast],
  );

  const success = useCallback(
    (title: string, message?: string) =>
      toast({ type: 'success', title, message }),
    [toast],
  );
  const error = useCallback(
    (title: string, message?: string) =>
      toast({ type: 'error', title, message }),
    [toast],
  );
  const info = useCallback(
    (title: string, message?: string) =>
      toast({ type: 'info', title, message }),
    [toast],
  );

  return (
    <ToastContext.Provider value={{ toast, success, error, info }}>
      {children}
      <div className="pointer-events-none fixed right-4 bottom-4 z-50 flex w-full max-w-sm flex-col gap-2 p-4">
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className={cn(
              'animate-slide-up bg-surface border-line text-foreground pointer-events-auto flex items-start gap-3 rounded-lg border p-3.5 text-xs shadow-lg',
              t.type === 'success' && 'border-success/30 bg-success-soft/20',
              t.type === 'error' && 'border-danger/30 bg-danger-soft/20',
              t.type === 'info' && 'border-info/30 bg-info-soft/20',
            )}
          >
            {t.type === 'success' ? (
              <CircleCheck className="text-success mt-0.5 size-4 shrink-0" />
            ) : t.type === 'error' ? (
              <CircleAlert className="text-danger mt-0.5 size-4 shrink-0" />
            ) : (
              <Info className="text-info mt-0.5 size-4 shrink-0" />
            )}
            <div className="flex-1">
              <p className="text-foreground font-semibold">{t.title}</p>
              {t.message ? (
                <p className="text-foreground-muted mt-0.5">{t.message}</p>
              ) : null}
            </div>
            <button
              type="button"
              onClick={() => removeToast(t.id)}
              className="text-foreground-subtle hover:text-foreground shrink-0 cursor-pointer rounded p-0.5"
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
}
