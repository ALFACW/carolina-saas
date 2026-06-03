import React from 'react'
import { useSounds } from '../../hooks/useSounds'
import { COP } from '../../lib/format'

export function ProductoCard({ producto, onAgregar }) {
  const { scan } = useSounds()
  const sinStock = producto.stock_actual <= 0
  const stockBajo = !sinStock && producto.stock_actual <= producto.stock_minimo

  return (
    <button
      onClick={() => { if (!sinStock && onAgregar) { scan(); onAgregar(producto) } }}
      disabled={sinStock}
      className={`w-full text-left bg-white border rounded-lg p-3.5 transition-all group ${
        sinStock
          ? 'border-gray-100 opacity-50 cursor-not-allowed'
          : 'border-gray-100 hover:border-gray-300 hover:shadow-sm cursor-pointer'
      }`}
    >
      <div className="flex items-start justify-between gap-2 mb-2">
        <p className="text-sm font-semibold text-gray-900 leading-tight line-clamp-2 group-hover:text-black">
          {producto.nombre}
        </p>
        {stockBajo && (
          <span className="flex-shrink-0 text-xs font-medium text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded">
            Bajo
          </span>
        )}
        {sinStock && (
          <span className="flex-shrink-0 text-xs font-medium text-gray-400 bg-gray-50 px-1.5 py-0.5 rounded">
            Agotado
          </span>
        )}
      </div>

      {producto.codigo && (
        <p className="text-xs text-gray-400 mb-2">{producto.codigo}</p>
      )}

      <div className="flex items-center justify-between">
        <p className="text-sm font-bold text-gray-900">{COP(producto.precio_venta)}</p>
        <p className="text-xs text-gray-400">{producto.stock_actual} uds</p>
      </div>
    </button>
  )
}
