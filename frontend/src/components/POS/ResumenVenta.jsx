import React from 'react'
import { usePOSStore } from '../../store/posStore'
import { COP } from '../../lib/format'

export function ResumenVenta() {
  const subtotal = usePOSStore(s => s.getSubtotal())
  const iva      = usePOSStore(s => s.getIVA())
  const total    = usePOSStore(s => s.getTotal())

  return (
    <div className="px-4 py-3 border-t border-gray-100 space-y-1.5">
      <div className="flex justify-between text-xs text-gray-400">
        <span>Subtotal</span>
        <span>{COP(subtotal)}</span>
      </div>
      <div className="flex justify-between text-xs text-gray-400">
        <span>IVA</span>
        <span>{COP(iva)}</span>
      </div>
      <div className="flex justify-between text-sm font-bold text-gray-900 border-t border-gray-100 pt-2 mt-1">
        <span>Total</span>
        <span>{COP(total)}</span>
      </div>
    </div>
  )
}
