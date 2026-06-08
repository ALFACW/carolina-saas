import React from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { posService } from '../services/pos'
import api from '../services/api'
import { COP } from '../lib/format'
import { DollarSign, ShoppingCart, AlertCircle, TrendingUp } from 'lucide-react'
import KPICard from '../components/ui/KPICard'
import { KPISkeleton, TableSkeleton } from '../components/Common/PageSkeleton'

const ESTADO_STYLE = {
  enviada:  'bg-green-50 text-success',
  aceptada: 'bg-blue-50 text-accent',
  anulada:  'bg-surface-soft text-ink-2',
  pendiente:'bg-yellow-50 text-warning',
}

export default function Dashboard() {
  const { data: dash, isLoading } = useQuery({
    queryKey: ['pos-dashboard'],
    queryFn: posService.getDashboard,
    refetchInterval: false,
    refetchOnWindowFocus: true,
  })

  const { data: topProductos } = useQuery({
    queryKey: ['top-productos'],
    queryFn: async () => { const { data } = await api.get('/api/reportes/productos-mas-vendidos?limit=5'); return data },
    staleTime: 300000,
    refetchInterval: false,
    refetchOnWindowFocus: true,
  })

  const { data: stockBajo } = useQuery({
    queryKey: ['stock-bajo'],
    queryFn: async () => { const { data } = await api.get('/api/reportes/stock-bajo'); return data },
    staleTime: 120000,
    refetchInterval: false,
    refetchOnWindowFocus: true,
  })

  const ventasHoy = dash?.ventas_hoy || { cantidad: 0, total: 0 }
  const ventasMes = dash?.ventas_mes || { cantidad: 0, total: 0 }
  const ultimas = dash?.ultimas_facturas || []

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink">Dashboard</h1>
          <p className="text-sm text-ink-2 mt-0.5">Resumen de tu negocio hoy</p>
        </div>
        <Link to="/pos" className="inline-flex items-center gap-2 bg-accent hover:bg-accent/90 text-white font-semibold px-4 py-2.5 rounded-lg text-sm transition-colors">
          <ShoppingCart size={16} /> Nueva venta
        </Link>
      </div>

      {/* Alerta stock bajo */}
      {stockBajo?.length > 0 && (
        <div className="border border-orange-200 bg-orange-50 rounded-xl px-5 py-3 flex items-center justify-between">
          <p className="text-sm text-orange-800 flex items-center gap-2">
            <AlertCircle size={16} />
            <span className="font-semibold">{stockBajo.length} producto{stockBajo.length > 1 ? 's' : ''}</span> con stock bajo o agotado
          </p>
          <Link to="/productos" className="text-xs font-semibold text-orange-700 hover:underline">Ver productos →</Link>
        </div>
      )}

      {/* KPIs */}
      {isLoading ? (
        <KPISkeleton count={4} />
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KPICard icon={ShoppingCart} label="Ventas hoy" value={ventasHoy.cantidad} />
          <KPICard icon={DollarSign} label="Ingresos hoy" value={COP(ventasHoy.total)} />
          <KPICard icon={TrendingUp} label="Ventas del mes" value={ventasMes.cantidad} />
          <KPICard icon={DollarSign} label="Ingresos del mes" value={COP(ventasMes.total)} />
        </div>
      )}

      {/* Acciones rápidas */}
      <div>
        <p className="text-base font-semibold text-ink mb-3">Acceso rápido</p>
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
              className="px-4 py-2 text-sm font-medium text-ink bg-white border border-border rounded-lg hover:bg-surface-soft transition-colors"
            >
              {label}
            </Link>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Últimas facturas */}
        <div className="bg-white rounded-xl border border-border shadow-sm">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <p className="text-sm font-semibold text-ink">Últimas facturas</p>
            <Link to="/facturas" className="text-xs text-ink-2 hover:text-ink font-medium">Ver todas</Link>
          </div>
          {isLoading ? (
            <div className="p-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between py-2.5 border-b border-border last:border-0">
                  <div className="space-y-1.5">
                    <div className="skeleton h-3.5 w-28 rounded" />
                    <div className="skeleton h-3 w-16 rounded" />
                  </div>
                  <div className="space-y-1.5 items-end flex flex-col">
                    <div className="skeleton h-3.5 w-20 rounded" />
                    <div className="skeleton h-4 w-16 rounded-full" />
                  </div>
                </div>
              ))}
            </div>
          ) : ultimas.length === 0 ? (
            <p className="px-5 py-8 text-sm text-ink-2">Sin facturas aún</p>
          ) : (
            <div className="divide-y divide-border">
              {ultimas.slice(0, 6).map(f => (
                <Link key={f.id} to={`/facturas/${f.id}`} className="flex items-center justify-between px-5 py-3 hover:bg-surface-soft transition-colors">
                  <div>
                    <p className="text-sm font-medium text-ink">{f.numero_factura || 'Sin número'}</p>
                    <p className="text-xs text-ink-2">{new Date(f.fecha_emision).toLocaleDateString('es-CO')}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-ink">{COP(f.total)}</p>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ESTADO_STYLE[f.estado] || 'bg-surface-soft text-ink-2'}`}>
                      {f.estado}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Top productos */}
        <div className="bg-white rounded-xl border border-border shadow-sm">
          <div className="px-5 py-4 border-b border-border flex items-center justify-between">
            <p className="text-sm font-semibold text-ink">Productos más vendidos</p>
            <Link to="/productos" className="text-xs text-ink-2 hover:text-ink font-medium">Ver todos</Link>
          </div>
          {isLoading ? (
            <div className="p-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 py-2.5 border-b border-border last:border-0">
                  <div className="skeleton w-4 h-3 rounded" />
                  <div className="flex-1 space-y-1.5">
                    <div className="skeleton h-3.5 w-36 rounded" />
                    <div className="skeleton h-3 w-20 rounded" />
                  </div>
                  <div className="skeleton h-3.5 w-16 rounded" />
                </div>
              ))}
            </div>
          ) : !topProductos?.length ? (
            <p className="px-5 py-8 text-sm text-ink-2">Sin datos de ventas aún</p>
          ) : (
            <div className="divide-y divide-border">
              {topProductos.map((p, i) => (
                <div key={p.id} className="flex items-center gap-4 px-5 py-3">
                  <span className="text-xs font-bold text-ink-2/40 w-4">{i + 1}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-ink truncate">{p.nombre}</p>
                    <p className="text-xs text-ink-2">{p.total_vendido} unidades</p>
                  </div>
                  <p className="text-sm font-semibold text-accent">{COP(p.ingresos)}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
