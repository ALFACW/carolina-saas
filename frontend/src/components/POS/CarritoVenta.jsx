import React, { useState } from 'react'
import { X, Tag } from 'lucide-react'
import { usePOSStore } from '../../store/posStore'
import { COP } from '../../lib/format'

export function CarritoVenta() {
  const { carrito, actualizarCantidad, removerItem, actualizarDescuento } = usePOSStore()
  const [editandoDescuento, setEditandoDescuento] = useState(null) // producto_id

  if (carrito.length === 0) {
    return (
      <div className="flex items-center justify-center h-full py-12">
        <p className="text-sm text-gray-300">Carrito vacío</p>
      </div>
    )
  }

  return (
    <div className="divide-y divide-gray-50">
      {carrito.map(item => {
        const subtotal = item.precio_unitario * item.cantidad * (1 - item.descuento / 100)
        const conDescuento = item.descuento > 0

        return (
          <div key={item.producto_id} className="px-4 py-3">
            {/* Nombre + eliminar */}
            <div className="flex items-start justify-between gap-2 mb-1.5">
              <p className="text-sm font-medium text-gray-900 leading-tight flex-1">{item.nombre}</p>
              <button
                onClick={() => removerItem(item.producto_id)}
                className="flex-shrink-0 text-gray-300 hover:text-gray-600 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Cantidad + precio + total */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => actualizarCantidad(item.producto_id, item.cantidad - 1)}
                  className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-gray-900 border border-gray-200 rounded text-sm font-medium leading-none hover:border-gray-400 transition-colors"
                >−</button>
                <span className="text-sm font-semibold text-gray-900 w-6 text-center">{item.cantidad}</span>
                <button
                  onClick={() => actualizarCantidad(item.producto_id, item.cantidad + 1)}
                  disabled={item.cantidad >= item.stock_actual}
                  className="w-6 h-6 flex items-center justify-center text-gray-400 hover:text-gray-900 border border-gray-200 rounded text-sm font-medium leading-none hover:border-gray-400 transition-colors disabled:opacity-30"
                >+</button>
                <span className="text-xs text-gray-400">{COP(item.precio_unitario)}</span>
              </div>
              <div className="text-right">
                {conDescuento && (
                  <p className="text-xs text-gray-400 line-through">{COP(item.precio_unitario * item.cantidad)}</p>
                )}
                <p className="text-sm font-bold text-gray-900">{COP(subtotal)}</p>
              </div>
            </div>

            {/* Descuento */}
            <div className="mt-1.5">
              {editandoDescuento === item.producto_id ? (
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-gray-500">Descuento:</span>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    defaultValue={item.descuento}
                    autoFocus
                    className="w-16 px-2 py-0.5 text-xs border border-blue-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 text-center"
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        const v = Math.min(100, Math.max(0, parseFloat(e.target.value) || 0))
                        actualizarDescuento(item.producto_id, v)
                        setEditandoDescuento(null)
                      }
                      if (e.key === 'Escape') setEditandoDescuento(null)
                    }}
                    onBlur={e => {
                      const v = Math.min(100, Math.max(0, parseFloat(e.target.value) || 0))
                      actualizarDescuento(item.producto_id, v)
                      setEditandoDescuento(null)
                    }}
                  />
                  <span className="text-xs text-gray-500">%</span>
                </div>
              ) : (
                <button
                  onClick={() => setEditandoDescuento(item.producto_id)}
                  className={`flex items-center gap-1 text-xs transition-colors ${
                    conDescuento ? 'text-blue-600 hover:text-blue-800' : 'text-gray-400 hover:text-gray-600'
                  }`}
                >
                  <Tag className="w-3 h-3" />
                  {conDescuento ? `${item.descuento}% descuento` : 'Agregar descuento'}
                </button>
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
