import React from 'react'
import { usePOSStore } from '../../store/posStore'

const METODOS = [
  { id: 'efectivo',       label: 'Efectivo' },
  { id: 'tarjeta_debito', label: 'Débito' },
  { id: 'tarjeta_credito',label: 'Crédito' },
  { id: 'transferencia',  label: 'Transferencia' },
  { id: 'credito',        label: 'A crédito' },
]

export function MetodoPago() {
  const { metodoPago, setMetodoPago } = usePOSStore()
  return (
    <div className="px-4 py-3 border-t border-gray-50">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Método de pago</p>
      <div className="flex flex-wrap gap-1.5">
        {METODOS.map(m => (
          <button
            key={m.id}
            onClick={() => setMetodoPago(m.id)}
            className={`px-3 py-1.5 text-xs font-medium rounded-md border transition-colors ${
              metodoPago === m.id
                ? 'bg-gray-900 text-white border-gray-900'
                : 'bg-white text-gray-500 border-gray-200 hover:border-gray-400 hover:text-gray-900'
            }`}
          >
            {m.label}
          </button>
        ))}
      </div>
    </div>
  )
}
