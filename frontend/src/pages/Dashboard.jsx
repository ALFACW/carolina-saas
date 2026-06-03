import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { posService } from '../services/pos'
import api from '../services/api'
import { COP } from '../lib/format'

function StatCard({ label, value, sub, accent = false }) {
  return (
    <div className="bg-white rounded-lg border border-gray-100 p-6">
      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">{label}</p>
      <p className={`text-3xl font-bold tracking-tight ${accent ? 'text-gray-900' : 'text-gray-900'}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
    </div>
  )
}

const ESTADO_STYLE = {
  enviada:  'text-green-700 bg-green-50',
  aceptada: 'text-blue-700 bg-blue-50',
  anulada:  'text-gray-500 bg-gray-50',
  pendiente:'text-yellow-700 bg-yellow-50',
}

export default function Dashboard() {
  const { data: dash } = useQuery({
    queryKey: ['pos-dashboard'],
    queryFn: posService.getDashboard,
    refetchInterval: 60000,
  })

  const { data: topProductos } = useQuery({
    queryKey: ['top-productos'],
    queryFn: async () => { const { data } = await api.get('/api/reportes/productos-mas-vendidos?limit=5'); return data },
    staleTime: 300000,
  })

  const { data: stockBajo } = useQuery({
    queryKey: ['stock-bajo'],
    queryFn: async () => { const { data } = await api.get('/api/reportes/stock-bajo'); return data },
    staleTime: 120000,
  })

  const ventasHoy = dash?.ventas_hoy || { cantidad: 0, total: 0 }
  const ventasMes = dash?.ventas_mes || { cantidad: 0, total: 0 }
  const ultimas = dash?.ultimas_facturas || []

  return (
    <div className="space-y-8 max-w-6xl">

      {/* Alerta stock bajo */}
      {stockBajo?.length > 0 && (
        <div className="border border-orange-200 bg-orange-50 rounded-lg px-5 py-3 flex items-center justify-between">
          <p className="text-sm text-orange-800">
            <span className="font-semibold">{stockBajo.length} producto{stockBajo.length > 1 ? 's' : ''}</span> con stock bajo o agotado
          </p>
          <Link to="/productos" className="text-xs font-medium text-orange-700 hover:underline">Ver productos →</Link>
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Ventas hoy" value={ventasHoy.cantidad} sub={`${COP(ventasHoy.total)} en ingresos`} />
        <StatCard label="Ingresos hoy" value={COP(ventasHoy.total)} sub={`${ventasHoy.cantidad} transacciones`} />
        <StatCard label="Ventas del mes" value={ventasMes.cantidad} sub={`${COP(ventasMes.total)} en ingresos`} />
        <StatCard label="Ingresos del mes" value={COP(ventasMes.total)} accent />
      </div>

      {/* Acciones rápidas */}
      <div>
        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Acceso rápido</p>
        <div className="flex flex-wrap gap-2">
          {[
            { to: '/pos',            label: 'Nueva venta' },
            { to: '/productos/nuevo',label: 'Nuevo producto' },
            { to: '/clientes/nuevo', label: 'Nuevo cliente' },
            { to: '/reportes',       label: 'Ver reportes' },
          ].map(({ to, label }) => (
            <Link
              key={to}
              to={to}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-md hover:bg-gray-50 transition-colors"
            >
              {label}
            </Link>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Últimas facturas */}
        <div className="bg-white rounded-lg border border-gray-100">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <p className="text-sm font-semibold text-gray-900">Últimas facturas</p>
            <Link to="/facturas" className="text-xs text-gray-400 hover:text-gray-700">Ver todas</Link>
          </div>
          {ultimas.length === 0 ? (
            <p className="px-5 py-8 text-sm text-gray-400">Sin facturas aún</p>
          ) : (
            <div className="divide-y divide-gray-50">
              {ultimas.slice(0, 6).map(f => (
                <Link key={f.id} to={`/facturas/${f.id}`} className="flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition-colors">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{f.numero_factura || 'Sin número'}</p>
                    <p className="text-xs text-gray-400">{new Date(f.fecha_emision).toLocaleDateString('es-CO')}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-gray-900">{COP(f.total)}</p>
                    <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${ESTADO_STYLE[f.estado] || 'text-gray-500 bg-gray-50'}`}>
                      {f.estado}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Top productos */}
        <div className="bg-white rounded-lg border border-gray-100">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <p className="text-sm font-semibold text-gray-900">Productos más vendidos</p>
            <Link to="/productos" className="text-xs text-gray-400 hover:text-gray-700">Ver todos</Link>
          </div>
          {!topProductos?.length ? (
            <p className="px-5 py-8 text-sm text-gray-400">Sin datos de ventas aún</p>
          ) : (
            <div className="divide-y divide-gray-50">
              {topProductos.map((p, i) => (
                <div key={p.id} className="flex items-center gap-4 px-5 py-3">
                  <span className="text-xs font-bold text-gray-300 w-4">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{p.nombre}</p>
                    <p className="text-xs text-gray-400">{p.total_vendido} unidades</p>
                  </div>
                  <p className="text-sm font-semibold text-gray-700">{COP(p.ingresos)}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
