import React from 'react'
import { AlertTriangle, Trash2 } from 'lucide-react'

export default function ConfirmDialog({ open, onClose, onConfirm, title, message, confirmLabel = 'Confirmar', confirmVariant = 'danger', loading = false }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 z-10">
        <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 ${confirmVariant === 'danger' ? 'bg-red-50' : 'bg-accent-soft'}`}>
          {confirmVariant === 'danger'
            ? <Trash2 size={22} className="text-danger" />
            : <AlertTriangle size={22} className="text-warning" />}
        </div>
        <h3 className="text-base font-semibold text-ink text-center mb-2">{title}</h3>
        <p className="text-sm text-ink-2 text-center mb-6">{message}</p>
        <div className="flex gap-3">
          <button onClick={onClose} disabled={loading}
            className="flex-1 border border-border text-ink font-medium py-2.5 rounded-lg text-sm hover:bg-surface-soft transition-colors focus:ring-2 focus:ring-accent/30 focus:outline-none">
            Cancelar
          </button>
          <button onClick={onConfirm} disabled={loading}
            className={`flex-1 font-semibold py-2.5 rounded-lg text-sm transition-colors focus:ring-2 focus:ring-accent/30 focus:outline-none ${
              confirmVariant === 'danger'
                ? 'bg-danger hover:bg-red-700 text-white'
                : 'bg-accent hover:bg-accent/90 text-white'
            }`}>
            {loading ? 'Procesando...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
