import React from 'react';
import { AlertCircle, Check } from 'lucide-react';
import type { ToastMsg } from '../hooks/useToast';

interface ToastContainerProps {
  toasts: ToastMsg[];
}

export const ToastContainer: React.FC<ToastContainerProps> = ({ toasts }) => {
  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`px-4 py-3 rounded-lg shadow-xl text-sm flex items-center gap-3 transform transition-all duration-300 pointer-events-auto ${
            t.type === 'error'
              ? 'bg-red-900/90 text-red-100 border border-red-800'
              : t.type === 'success'
              ? 'bg-emerald-900/90 text-emerald-100 border border-emerald-800'
              : 'bg-slate-800/90 text-slate-200 border border-slate-700'
          }`}
        >
          {t.type === 'error' ? <AlertCircle className="w-4 h-4 shrink-0" /> : <Check className="w-4 h-4 shrink-0" />}
          <p>{t.message}</p>
        </div>
      ))}
    </div>
  );
};
