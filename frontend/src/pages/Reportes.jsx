import React, { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid } from 'recharts'
import api from '../services/api'
import { Loading } from '../components/Common/Loading'
import { Button } from '../components/Common/Button'
import { TrendingUp, Package, AlertTriangle, Download } from 'lucide-react'
import { COP } from '../lib/format'
import { exportarVentasDia } from '../lib/exportExcel'
const hoy = new Date()

export default function Reportes() {
  const [mes, setMes] = useState(hoy.getMonth() + 1)
  const [anio, setAnio] = useState(hoy.getFullYear())

  const { data: ventasMes, isLoading: loadingMes } = useQuery({
    queryKey: ['reporte-mes-detalle', mes, anio],
    queryFn: async () => { const { data } = await api.get(`/api/reportes/ventas-mes?mes=${mes}&anio=${anio}`); return data },
  })

  const { data: topProductos } = useQuery({
    queryKey: ['top-productos-reporte'],
    queryFn: async () => { const { data } = await api.get('/api/reportes/productos-mas-vendidos?limit=10'); return data },
  })

  const { data: stockBajo } = useQuery({
    queryKey: ['stock-bajo-reporte'],
    queryFn: async () => { const { data } = await api.get('/api/reportes/stock-bajo'); return data },
  })

  const chartData = ventasMes?.por_dia?.map(d => ({
    dia: new Date(d.dia + 'T12:00:00').getDate(),
    ventas: d.cantidad,
    total: parseFloat(d.total_dia),
  })) || []

  const MESES = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink">Reportes</h1>
          <p className="text-sm text-ink-2 mt-0.5">Análisis de tu negocio</p>
        </div>
        <div className="flex items-center gap-2">
          <select value={mes} onChange={e => setMes(Number(e.target.value))} className="px-3 py-2.5 border border-border rounded-lg text-sm text-ink bg-white focus:outline-none focus:ring-2 focus:ring-accent-line">
            {MESES.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
          </select>
          <select value={anio} onChange={e => setAnio(Number(e.target.value))} className="px-3 py-2.5 border border-border rounded-lg text-sm text-ink bg-white focus:outline-none focus:ring-2 focus:ring-accent-line">
            {[2024, 2025, 2026].map(a => <option key={a} value={a}>{a}</option>)}
          </select>
          <Button variant="secondary" onClick={() => exportarVentasDia(ventasMes?.ventas || ventasMes?.por_dia || [], `${anio}-${String(mes).padStart(2,'0')}`)}>
            <Download className="w-3.5 h-3.5" />Excel
          </Button>
        </div>
      </div>

      {/* Cards resumen mes */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-border p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <TrendingUp className="w-5 h-5 text-accent" />
            <span className="text-sm text-ink-2">Ventas del mes</span>
          </div>
          <p className="text-2xl font-bold text-ink">{ventasMes?.por_dia?.reduce((s, d) => s + parseInt(d.cantidad), 0) || 0}</p>
          <p className="text-sm text-ink-2">transacciones</p>
        </div>
        <div className="bg-white rounded-xl border border-border p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <TrendingUp className="w-5 h-5 text-success" />
            <span className="text-sm text-ink-2">Ingresos del mes</span>
          </div>
          <p className="text-2xl font-bold text-ink">{COP(ventasMes?.total_mes || 0)}</p>
        </div>
        <div className="bg-white rounded-xl border border-border p-5 shadow-sm">
          <div className="flex items-center gap-3 mb-2">
            <AlertTriangle className="w-5 h-5 text-warning" />
            <span className="text-sm text-ink-2">Stock bajo</span>
          </div>
          <p className="text-2xl font-bold text-ink">{stockBajo?.length || 0}</p>
          <p className="text-sm text-ink-2">productos</p>
        </div>
      </div>

      {/* Gráfico ventas por día */}
      <div className="bg-white rounded-xl border border-border p-5 shadow-sm">
        <h3 className="font-semibold text-ink mb-4">Ingresos por día — {MESES[mes - 1]} {anio}</h3>
        {loadingMes ? <Loading /> : chartData.length === 0 ? (
          <p className="text-ink-2 text-sm text-center py-8">Sin datos para este período</p>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e8e8ea" />
              <XAxis dataKey="dia" tick={{ fontSize: 12, fill: '#565660' }} />
              <YAxis tick={{ fontSize: 12, fill: '#565660' }} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
              <Tooltip formatter={v => COP(v)} labelFormatter={l => `Día ${l}`} />
              <Bar dataKey="total" fill="#1c61c0" radius={[4, 4, 0, 0]} name="Ingresos" />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Top productos */}
      {topProductos?.length > 0 && (
        <div className="bg-white rounded-xl border border-border p-5 shadow-sm">
          <h3 className="font-semibold text-ink mb-4">Productos más vendidos</h3>
          <div className="space-y-3">
            {topProductos.map((p, i) => (
              <div key={p.id} className="flex items-center gap-3">
                <span className="w-6 h-6 bg-accent-soft rounded-full flex items-center justify-center text-xs font-bold text-accent">{i + 1}</span>
                <div className="flex-1">
                  <p className="text-sm font-medium text-ink">{p.nombre}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <div className="flex-1 bg-border rounded-full h-1.5">
                      <div className="bg-accent h-1.5 rounded-full" style={{ width: `${Math.min(100, (p.total_vendido / (topProductos[0]?.total_vendido || 1)) * 100)}%` }} />
                    </div>
                    <span className="text-xs text-ink-2">{p.total_vendido} uds</span>
                  </div>
                </div>
                <span className="text-sm font-bold text-accent">{COP(p.ingresos)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Stock bajo */}
      {stockBajo?.length > 0 && (
        <div className="bg-white rounded-xl border border-border p-5 shadow-sm">
          <h3 className="font-semibold text-ink mb-4 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-warning" />
            Productos con stock bajo ({stockBajo.length})
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-border bg-surface-soft">
                <th className="text-left px-4 py-3 text-xs font-semibold text-ink-2 uppercase tracking-wider">Producto</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-ink-2 uppercase tracking-wider">Stock actual</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-ink-2 uppercase tracking-wider">Mínimo</th>
              </tr></thead>
              <tbody>
                {stockBajo.map(p => (
                  <tr key={p.id} className="border-b border-border hover:bg-surface-soft transition-colors">
                    <td className="px-4 py-3 text-sm text-ink">{p.nombre}</td>
                    <td className="px-4 py-3 text-right text-sm font-bold text-danger">{p.stock_actual}</td>
                    <td className="px-4 py-3 text-right text-sm text-ink-2">{p.stock_minimo}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
