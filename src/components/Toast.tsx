import React, { useEffect } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export interface ToastMessage {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

interface ToastProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export const ToastContainer: React.FC<ToastProps> = ({ toasts, onDismiss }) => {
  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none">
      {toasts.map(toast => (
        <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  );
};

const ToastItem: React.FC<{ toast: ToastMessage; onDismiss: (id: string) => void }> = ({
  toast,
  onDismiss,
}) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss(toast.id);
    }, 3500);
    return () => clearTimeout(timer);
  }, [toast.id, onDismiss]);

  const icons = {
    success: <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0" />,
    error: <AlertCircle className="w-5 h-5 text-rose-600 dark:text-rose-400 shrink-0" />,
    info: <Info className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0" />,
  };

  const bgStyles = {
    success: 'bg-white dark:bg-slate-900 border-emerald-200 dark:border-emerald-800 text-slate-900 dark:text-slate-100',
    error: 'bg-white dark:bg-slate-900 border-rose-200 dark:border-rose-800 text-slate-900 dark:text-slate-100',
    info: 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-slate-100',
  };

  return (
    <div
      role="status"
      className={`pointer-events-auto flex items-center justify-between gap-3 px-4 py-3 rounded-lg border shadow-lg transition-all duration-200 animate-in fade-in slide-in-from-bottom-2 ${bgStyles[toast.type]}`}
    >
      <div className="flex items-center gap-3 min-w-0">
        {icons[toast.type]}
        <p className="text-sm font-medium leading-snug truncate">{toast.message}</p>
      </div>
      <button
        type="button"
        onClick={() => onDismiss(toast.id)}
        aria-label="Close notification"
        className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors shrink-0"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};
