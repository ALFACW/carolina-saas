import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { AlertTriangle } from 'lucide-react'
import api from '../../services/api'

export function AlertaStock() {
  const { data: productos } = useQuery({
    queryKey: ['stock-bajo'],
    queryFn: async () => { const { data } = await api.get('/api/reportes/stock-bajo'); return data },
    staleTime: 120000,
  })
  if (!productos?.length) return null
  return (
    <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 mb-4">
      <div className="flex items-center gap-2 mb-2">
        <AlertTriangle className="w-5 h-5 text-orange-600" />
        <span className="font-semibold text-orange-800">Stock bajo en {productos.length} producto(s)</span>
      </div>
      <div className="space-y-1">
        {productos.slice(0, 5).map(p => (
          <div key={p.id} className="flex justify-between text-sm text-orange-700">
            <span>{p.nombre}</span>
            <span>{p.stock_actual} / mín {p.stock_minimo}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
