'use client';

export interface ToastItem {
  id: string;
  message: string;
  type?: 'success' | 'error' | 'info';
}

interface ToastsProps {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
}

export default function Toasts({ toasts, onDismiss }: ToastsProps) {
  if (!toasts.length) return null;

  return (
    <div
      className="fixed bottom-4 right-4 z-50 flex flex-col gap-2"
      role="region"
      aria-label="Notifications"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`px-4 py-3 rounded-lg shadow-lg border flex items-center justify-between gap-4 min-w-[280px] ${
            t.type === 'error'
              ? 'bg-red-50 border-red-200 text-red-800'
              : t.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-white border-[var(--ldv-border)] text-primary'
          }`}
        >
          <span className="text-sm">{t.message}</span>
          <button
            type="button"
            onClick={() => onDismiss(t.id)}
            className="text-[var(--ldv-text-muted)] hover:text-primary p-1"
            aria-label="Dismiss"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  );
}
