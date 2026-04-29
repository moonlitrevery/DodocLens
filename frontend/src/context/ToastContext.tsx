import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

export type ToastVariant = "success" | "error" | "info";

export type ToastInput = {
  variant: ToastVariant;
  message: string;
  /** ms; default 4500 */
  duration?: number;
};

type ToastRecord = ToastInput & { id: number };

type ToastContextValue = {
  showToast: (t: ToastInput) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

const variantStyles: Record<ToastVariant, string> = {
  success:
    "border-dl-border bg-dl-violet/35 text-white shadow-card backdrop-blur-sm",
  error:
    "border-dl-pink/40 bg-dl-bg-deep/95 text-dl-coral shadow-card backdrop-blur-sm",
  info: "border-dl-border bg-dl-glass/90 text-white shadow-glass backdrop-blur-glass backdrop-saturate-[180%]",
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastRecord[]>([]);
  const idRef = useRef(0);

  const showToast = useCallback((t: ToastInput) => {
    const id = ++idRef.current;
    const duration = t.duration ?? 4500;
    const record: ToastRecord = { ...t, id };
    setToasts((prev) => [...prev, record]);
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((x) => x.id !== id));
    }, duration);
  }, []);

  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className="pointer-events-none fixed bottom-4 right-4 z-[100] flex max-w-sm flex-col gap-2 p-0 sm:max-w-md"
        aria-live="polite"
        aria-relevant="additions"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            role="status"
            className={`toast-item pointer-events-auto rounded-xl border px-4 py-3 text-sm font-medium leading-snug tracking-[0.2px] ${variantStyles[t.variant]}`}
          >
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast deve ser usado dentro de ToastProvider");
  return ctx;
}
