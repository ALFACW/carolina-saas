import React, { createContext, useContext, useState, useCallback, useRef } from 'react'
import { AlertTriangle, Info, Trash2 } from 'lucide-react'

/* ── Contexto ──────────────────────────────────────────────────────────────── */

const ConfirmContext = createContext(null)

const ICONS = {
  danger:  <AlertTriangle className="text-danger" size={22} />,
  warning: <AlertTriangle className="text-warning" size={22} />,
  info:    <Info          className="text-accent"  size={22} />,
  delete:  <Trash2        className="text-danger"  size={22} />,
}

const CONFIRM_STYLES = {
  danger:  'bg-danger   text-white hover:bg-danger/90',
  warning: 'bg-warning  text-white hover:bg-warning/90',
  info:    'bg-accent   text-white hover:bg-accent/90',
  delete:  'bg-danger   text-white hover:bg-danger/90',
}

/* ── Provider ──────────────────────────────────────────────────────────────── */

export function ConfirmProvider({ children }) {
  const [state, setState] = useState(null)
  const resolveRef = useRef(null)

  const confirm = useCallback((options) => {
    return new Promise((resolve) => {
      resolveRef.current = resolve
      setState({
        title:       options.title       || 'Confirmar acción',
        description: options.description || '¿Estás seguro? Esta acción no se puede deshacer.',
        confirmText: options.confirmText || 'Confirmar',
        cancelText:  options.cancelText  || 'Cancelar',
        variant:     options.variant     || 'danger',
      })
    })
  }, [])

  const handleResolve = (value) => {
    setState(null)
    resolveRef.current?.(value)
  }

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {state && (
        <div
          className="fixed inset-0 z-[10000] flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(2px)' }}
          onClick={() => handleResolve(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-xl w-full max-w-sm animate-fade-in-scale p-6"
            onClick={e => e.stopPropagation()}
          >
            {/* Ícono */}
            <div className="flex justify-center mb-4">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                state.variant === 'info' ? 'bg-accent-soft' : 'bg-red-50'
              }`}>
                {ICONS[state.variant]}
              </div>
            </div>

            {/* Texto */}
            <h3 className="text-base font-bold text-ink text-center mb-2">{state.title}</h3>
            <p className="text-sm text-ink-2 text-center leading-relaxed mb-6">{state.description}</p>

            {/* Botones */}
            <div className="flex gap-3">
              <button
                onClick={() => handleResolve(false)}
                className="flex-1 px-4 py-2.5 border border-border rounded-xl text-sm font-semibold text-ink-2 hover:bg-surface-soft transition-colors"
              >
                {state.cancelText}
              </button>
              <button
                onClick={() => handleResolve(true)}
                className={`flex-1 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors ${CONFIRM_STYLES[state.variant]}`}
              >
                {state.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  )
}

/* ── Hook ──────────────────────────────────────────────────────────────────── */

export function useConfirm() {
  const ctx = useContext(ConfirmContext)
  if (!ctx) throw new Error('useConfirm debe usarse dentro de ConfirmProvider')
  return ctx
}
