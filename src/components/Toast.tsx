import React, { useEffect, useState } from 'react';
import { CheckCircle2, AlertTriangle, Info } from 'lucide-react';

// Toasts globaux (CDC §6.2) — pattern généralisé de CabinetsEnAttentePage.
// Bus simple : `toast('Quittance enregistrée')` depuis n'importe quel handler,
// <ToastHost /> monté une fois à la racine de l'app.
export type ToastKind = 'success' | 'error' | 'info';

interface ToastItem {
  id: number;
  kind: ToastKind;
  message: string;
}

type Listener = (items: ToastItem[]) => void;

let nextId = 1;
let items: ToastItem[] = [];
const listeners = new Set<Listener>();
let timers = new Map<number, ReturnType<typeof setTimeout>>();

const TOAST_DURATION_MS = 3500;

function emit(): void {
  listeners.forEach((l) => l([...items]));
}

export function toast(message: string, kind: ToastKind = 'success'): void {
  const id = nextId++;
  items = [...items.slice(-2), { id, kind, message }];
  emit();
  const timer = setTimeout(() => {
    items = items.filter((t) => t.id !== id);
    timers.delete(id);
    emit();
  }, TOAST_DURATION_MS);
  timers.set(id, timer);
}

export const ToastHost: React.FC = () => {
  const [toasts, setToasts] = useState<ToastItem[]>(items);

  useEffect(() => {
    const listener: Listener = (next) => setToasts(next);
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  }, []);

  return (
    <div
      id="toastHost"
      aria-live="polite"
      className="fixed bottom-5 left-1/2 -translate-x-1/2 z-[100] flex flex-col items-center gap-2 px-4 w-full max-w-md pointer-events-none"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`pointer-events-auto w-full flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-2xl text-xs font-bold text-white animate-in fade-in slide-in-from-bottom-2 duration-200 ${
            t.kind === 'success' ? 'bg-[#1F9254]' : t.kind === 'error' ? 'bg-[#C4432B]' : 'bg-[#3D3680]'
          }`}
        >
          {t.kind === 'success' ? (
            <CheckCircle2 className="w-4 h-4 shrink-0" />
          ) : t.kind === 'error' ? (
            <AlertTriangle className="w-4 h-4 shrink-0" />
          ) : (
            <Info className="w-4 h-4 shrink-0" />
          )}
          <span>{t.message}</span>
        </div>
      ))}
    </div>
  );
};
