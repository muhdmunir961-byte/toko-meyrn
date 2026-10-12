import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';

export type ToastTone = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: number;
  tone: ToastTone;
  title: string;
  message?: string;
}

interface ToastContextValue {
  toast: (tone: ToastTone, title: string, message?: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);
const AUTO_DISMISS_MS = 5000;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    (tone: ToastTone, title: string, message?: string) => {
      const id = nextId.current++;
      setToasts((prev) => [...prev, { id, tone, title, message }]);
      window.setTimeout(() => dismiss(id), AUTO_DISMISS_MS);
    },
    [dismiss],
  );

  const value = useMemo(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="tpt-toast-region" role="region" aria-live="polite" aria-label="Notifications">
        {toasts.map((t) => (
          <div key={t.id} className={`tpt-toast tpt-toast--${t.tone}`} role="status">
            <div className="tpt-toast__content">
              <strong className="tpt-toast__title">{t.title}</strong>
              {t.message && <p className="tpt-toast__message">{t.message}</p>}
            </div>
            <button
              type="button"
              className="tpt-toast__close"
              aria-label="Dismiss notification"
              onClick={() => dismiss(t.id)}
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within a ToastProvider');
  return ctx;
}