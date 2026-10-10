import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import { Check, X } from "lucide-react";

interface ToastMessage { id: number; message: string; tone: "success" | "error" }
interface ToastValue { notify: (message: string, tone?: ToastMessage["tone"]) => void }
const ToastContext = createContext<ToastValue | null>(null);

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const notify = useCallback((message: string, tone: ToastMessage["tone"] = "success") => {
    const id = Date.now() + Math.random();
    setToasts((current) => [...current, { id, message, tone }]);
    window.setTimeout(() => setToasts((current) => current.filter((toast) => toast.id !== id)), 3500);
  }, []);
  const value = useMemo(() => ({ notify }), [notify]);
  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed bottom-5 right-5 z-50 flex w-[min(24rem,calc(100vw-2.5rem))] flex-col gap-2" aria-live="polite">
        {toasts.map((toast) => (
          <div key={toast.id} className={`flex items-center gap-2 rounded-xl border bg-white px-4 py-3 text-sm shadow-card ${toast.tone === "success" ? "border-emerald-200 text-emerald-800" : "border-rose-200 text-rose-800"}`}>
            {toast.tone === "success" ? <Check size={16} /> : <X size={16} />}{toast.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastValue {
  const value = useContext(ToastContext);
  if (!value) throw new Error("useToast must be used inside ToastProvider.");
  return value;
}
