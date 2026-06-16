'use client';
import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { CheckCircle2, X, AlertCircle } from 'lucide-react';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'success') => {
    const id = Date.now();
    setToasts(t => [...t, { id, message, type }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3500);
  }, []);

  return (
    <ToastContext.Provider value={addToast}>
      {children}
      {/* Portal de toasts */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 pointer-events-none">
        {toasts.map(toast => (
          <div
            key={toast.id}
            className="flex items-center gap-3 px-4 py-3 rounded-2xl pointer-events-auto"
            style={{
              background: '#0d1b2e',
              border: '1px solid rgba(255,255,255,0.10)',
              boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
              animation: 'slideIn 0.2s ease',
              minWidth: '260px',
              maxWidth: '400px',
            }}
          >
            {toast.type === 'success'
              ? <CheckCircle2 size={15} className="text-green-400 shrink-0" />
              : <AlertCircle size={15} className="text-red-400 shrink-0" />
            }
            <p className="text-[13px] font-medium" style={{ color: 'rgba(255,255,255,0.8)' }}>
              {toast.message}
            </p>
            <button
              onClick={() => setToasts(t => t.filter(x => x.id !== toast.id))}
              className="ml-auto text-white/25 hover:text-white/60 transition-colors"
            >
              <X size={12} />
            </button>
          </div>
        ))}
      </div>
      <style>{`
        @keyframes slideIn {
          from { opacity: 0; transform: translateY(8px) scale(0.97); }
          to   { opacity: 1; transform: translateY(0)    scale(1); }
        }
      `}</style>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
