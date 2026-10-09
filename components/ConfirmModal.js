'use client';
import { useEffect } from 'react';
import { AlertTriangle, X } from 'lucide-react';

export default function ConfirmModal({ open = true, title, body, message, confirmLabel = 'Confirmar', danger = true, onConfirm, onCancel }) {
  useEffect(() => {
    if (!open) return;
    const handleKey = e => { if (e.key === 'Escape') onCancel?.(); };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open, onCancel]);

  if (!open) return null;

  const texto = body ?? message;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
      onClick={e => { if (e.target === e.currentTarget) onCancel(); }}
    >
      <div
        className="w-full max-w-[360px] rounded-[22px] p-6 mx-4"
        style={{ background: '#141619', border: '1px solid rgba(255,255,255,0.08)', boxShadow: '0 24px 64px rgba(0,0,0,0.5)' }}
      >
        <div className="flex items-start gap-3 mb-5">
          <div className={`w-9 h-9 rounded-[14px] flex items-center justify-center shrink-0 ${danger ? 'bg-red-500/15' : 'bg-accent/15'}`}>
            <AlertTriangle size={16} className={danger ? 'text-red-400' : 'text-accent'} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[14px] font-semibold text-white mb-1">{title}</p>
            {texto && <p className="text-[12px] leading-relaxed" style={{ color: 'rgba(255,255,255,0.45)' }}>{texto}</p>}
          </div>
          <button onClick={onCancel} className="text-white/25 hover:text-white/60 transition-colors">
            <X size={15} />
          </button>
        </div>
        <div className="flex items-center gap-2 justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 rounded-[14px] text-[13px] font-medium transition-all"
            style={{ color: 'rgba(255,255,255,0.5)', border: '1px solid rgba(255,255,255,0.08)' }}
            onMouseEnter={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.8)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)'; }}
            onMouseLeave={e => { e.currentTarget.style.color = 'rgba(255,255,255,0.5)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)'; }}
          >
            Cancelar
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 rounded-[14px] text-[13px] font-semibold transition-all ${
              danger
                ? 'bg-red-600 hover:bg-red-500 text-white'
                : 'bg-accent hover:bg-accent-hover text-on-accent'
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
