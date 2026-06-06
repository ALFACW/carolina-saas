import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import {
  TrendingUp, TrendingDown, Minus, Check, Eye, X, ChevronDown, ChevronUp,
  Calendar, Filter, CheckCircle, AlertTriangle, Clock, DollarSign,
} from 'lucide-react'
import { cajasService } from '../services/cajas'
import { useAuth } from '../context/AuthContext'
import { Button } from '../components/Common/Button'
import { COP } from '../lib/format'

const ESTADO_BADGE = {
  abierta:  { cls: 'bg-blue-100 text-blue-700',   label: 'Abierta' },
  cerrada:  { cls: 'bg-yellow-100 text-yellow-700', label: 'Cerrada' },
  aprobada: { cls: 'bg-green-100 text-green-700',  label: 'Aprobada' },
}

const TIPO_CIERRE_LABEL = {
  cierre_final:  'Cierre del día',
  cambio_turno:  'Cambio de turno',
}

function DiferenciaBadge({ valor }) {
  const n = Number(valor ?? 0)
  if (n > 0) return (
    <span className="flex items-center gap-1 text-xs font-semibold text-success">
      <TrendingUp className="w-3.5 h-3.5" /> +{COP(n)}
    </span>
  )
  if (n < 0) return (
    <span className="flex items-center gap-1 text-xs font-semibold text-danger">
      <TrendingDown className="w-3.5 h-3.5" /> {COP(n)}
    </span>
  )
  return (
    <span className="flex items-center gap-1 text-xs font-semibold text-ink-2">
      <Minus className="w-3.5 h-3.5" /> Cuadrado
    </span>
  )
}

function DetalleSesion({ sesion, onClose, onAprobar, aprobando }) {
  const metodos = {
    Efectivo:      Number(sesion.total_efectivo     || 0),
    Tarjeta:       Number(sesion.total_tarjeta       || 0),
    Transferencia: Number(sesion.total_transferencia || 0),
    Crédito:       Number(sesion.total_credito       || 0),
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between px-6 pt-5 pb-4 border-b border-border">
          <div>
            <p className="text-base font-semibold text-ink">
              {TIPO_CIERRE_LABEL[sesion.tipo_cierre] || 'Cierre de caja'}
            </p>
            <p className="text-xs text-ink-2 mt-0.5">
              {sesion.cajero_nombre} · {sesion.caja_nombre || 'Sin caja asignada'}
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 text-ink-2 hover:text-ink hover:bg-surface-soft rounded-lg transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">
          {/* Fechas */}
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="bg-surface-soft rounded-xl p-3">
              <p className="text-xs text-ink-2 mb-1">Apertura</p>
              <p className="font-medium text-ink">
                {new Date(sesion.fecha_apertura).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' })}
              </p>
            </div>
            <div className="bg-surface-soft rounded-xl p-3">
              <p className="text-xs text-ink-2 mb-1">Cierre</p>
              <p className="font-medium text-ink">
                {sesion.fecha_cierre
                  ? new Date(sesion.fecha_cierre).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' })
                  : '—'}
              </p>
            </div>
          </div>

          {/* Ventas por método */}
          <div>
            <p className="text-xs font-semibold text-ink-2 uppercase tracking-wide mb-3">Ventas por método de pago</p>
            <div className="space-y-2">
              {Object.entries(metodos).map(([label, monto]) => monto > 0 && (
                <div key={label} className="flex justify-between text-sm">
                  <span className="text-ink-2">{label}</span>
                  <span className="font-medium text-ink">{COP(monto)}</span>
                </div>
              ))}
              <div className="flex justify-between text-sm font-bold border-t border-border pt-2">
                <span className="text-ink">Total ventas</span>
                <span className="text-accent">{COP(sesion.total_ventas || 0)}</span>
              </div>
            </div>
          </div>

          {/* Cuadratura */}
          <div>
            <p className="text-xs font-semibold text-ink-2 uppercase tracking-wide mb-3">Cuadratura de efectivo</p>
            <div className="bg-surface-soft rounded-xl p-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-ink-2">Fondo inicial</span>
                <span className="text-ink">{COP(sesion.fondo_inicial || 0)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-2">Ventas en efectivo</span>
                <span className="text-ink">+ {COP(sesion.total_efectivo || 0)}</span>
              </div>
              <div className="flex justify-between font-semibold border-t border-border pt-2">
                <span className="text-ink">Esperado en caja</span>
                <span className="text-ink">{COP((sesion.fondo_inicial || 0) + (sesion.total_efectivo || 0))}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-2">Contado físicamente</span>
                <span className="text-ink">{COP(sesion.efectivo_contado || 0)}</span>
              </div>
              <div className="flex justify-between font-bold border-t border-border pt-2">
                <span className="text-ink">Diferencia</span>
                <DiferenciaBadge valor={sesion.diferencia} />
              </div>
            </div>
          </div>

          {/* Fondo siguiente (cambio turno) */}
          {sesion.tipo_cierre === 'cambio_turno' && Number(sesion.fondo_siguiente || 0) > 0 && (
            <div className="flex justify-between text-sm bg-blue-50 border border-blue-200 rounded-xl p-4">
              <span className="text-blue-700 font-medium">Fondo dejado para siguiente cajero</span>
              <span className="font-bold text-blue-800">{COP(sesion.fondo_siguiente)}</span>
            </div>
          )}

          {/* Ventas del turno */}
          {sesion.facturas?.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-ink-2 uppercase tracking-wide mb-3">
                Ventas del turno ({sesion.facturas.length})
              </p>
              <div className="border border-border rounded-xl overflow-hidden">
                <div className="max-h-52 overflow-y-auto divide-y divide-border">
                  {sesion.facturas.map(f => (
                    <div key={f.id} className="flex items-center justify-between px-4 py-2.5 text-sm hover:bg-surface-soft">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-mono text-xs text-ink-2 flex-shrink-0">
                          {f.numero_factura || '—'}
                        </span>
                        {f.cliente_nombre && (
                          <span className="text-ink-2 truncate">{f.cliente_nombre}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <span className="text-xs text-ink-2 capitalize hidden sm:inline">
                          {f.metodo_pago?.replace('_', ' ')}
                        </span>
                        <span className={`text-xs font-medium ${f.estado === 'anulada' ? 'text-ink-2 line-through' : 'text-ink'}`}>
                          {COP(f.total)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Notas */}
          {sesion.notas_cierre && (
            <div>
              <p className="text-xs font-semibold text-ink-2 uppercase tracking-wide mb-1">Notas</p>
              <p className="text-sm text-ink bg-surface-soft rounded-xl p-3">{sesion.notas_cierre}</p>
            </div>
          )}

          {/* Aprobación */}
          {sesion.estado === 'aprobada' && sesion.aprobado_por_nombre && (
            <div className="flex items-center gap-2 text-xs text-success bg-green-50 border border-green-200 rounded-xl p-3">
              <CheckCircle className="w-4 h-4 flex-shrink-0" />
              Aprobado por {sesion.aprobado_por_nombre}
              {sesion.fecha_aprobacion && ` · ${new Date(sesion.fecha_aprobacion).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' })}`}
            </div>
          )}

          {sesion.estado === 'cerrada' && onAprobar && (
            <button
              onClick={() => onAprobar(sesion.id)}
              disabled={aprobando}
              className="w-full flex items-center justify-center gap-2 bg-accent hover:bg-accent/90 text-white font-semibold py-3 rounded-xl text-sm transition-colors disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              {aprobando ? 'Aprobando...' : 'Aprobar cuadratura'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

export default function CierresCaja() {
  const qc = useQueryClient()
  const { user } = useAuth()
  const isAdminOrSup = ['admin', 'supervisor'].includes(user?.rol)

  const hoy = new Date().toISOString().split('T')[0]
  const hace30 = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0]

  const [filtros, setFiltros] = useState({
    fecha_desde: hace30,
    fecha_hasta: hoy,
    caja_id:     '',
    cajero_id:   '',
    diferencia:  '', // 'cuadrado' | 'sobrante' | 'faltante' | ''
  })
  const [sesionDetalle, setSesionDetalle] = useState(null)
  const [expandido,     setExpandido]     = useState(false)

  const { data: cajas = [] } = useQuery({
    queryKey: ['cajas'],
    queryFn: cajasService.getCajas,
  })

  const { data: sesiones = [], isLoading } = useQuery({
    queryKey: ['cierres', filtros],
    queryFn: () => cajasService.getSesiones({
      ...filtros,
      estado: 'cerrada,aprobada',
    }),
  })

  const { data: sesionDetalleData, isLoading: loadingDetalle } = useQuery({
    queryKey: ['sesion', sesionDetalle],
    queryFn: () => cajasService.getSesion(sesionDetalle),
    enabled: !!sesionDetalle,
  })

  const aprobarMutation = useMutation({
    mutationFn: (id) => cajasService.aprobarSesion(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cierres'] })
      qc.invalidateQueries({ queryKey: ['sesion', sesionDetalle] })
    },
  })

  // Filtrar por diferencia en frontend
  const sesionesFiltered = sesiones.filter(s => {
    if (!filtros.diferencia) return true
    const d = Number(s.diferencia ?? 0)
    if (filtros.diferencia === 'cuadrado')  return d === 0
    if (filtros.diferencia === 'sobrante')  return d > 0
    if (filtros.diferencia === 'faltante')  return d < 0
    return true
  })

  // Resumen
  const totalVentas   = sesionesFiltered.reduce((a, s) => a + Number(s.total_ventas   || 0), 0)
  const totalDif      = sesionesFiltered.reduce((a, s) => a + Number(s.diferencia     || 0), 0)
  const conFaltante   = sesionesFiltered.filter(s => Number(s.diferencia || 0) < 0).length
  const conSobrante   = sesionesFiltered.filter(s => Number(s.diferencia || 0) > 0).length

  const fmtFecha = (f) => f
    ? new Date(f).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' })
    : '—'

  return (
    <div className="space-y-6">

      {/* Encabezado */}
      <div>
        <h1 className="text-2xl font-bold text-ink">Cierres de caja</h1>
        <p className="text-sm text-ink-2 mt-0.5">Historial de turnos y cuadratura de efectivo</p>
      </div>

      {/* Cards resumen */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-border rounded-xl p-4 shadow-sm">
          <p className="text-xs text-ink-2 font-medium uppercase tracking-wide mb-1">Total ventas</p>
          <p className="text-xl font-bold text-ink">{COP(totalVentas)}</p>
          <p className="text-xs text-ink-2 mt-1">{sesionesFiltered.length} cierres</p>
        </div>
        <div className={`bg-white border rounded-xl p-4 shadow-sm ${totalDif < 0 ? 'border-red-200' : totalDif > 0 ? 'border-green-200' : 'border-border'}`}>
          <p className="text-xs text-ink-2 font-medium uppercase tracking-wide mb-1">Diferencia total</p>
          <p className={`text-xl font-bold ${totalDif < 0 ? 'text-danger' : totalDif > 0 ? 'text-success' : 'text-ink-2'}`}>
            {totalDif > 0 ? '+' : ''}{COP(totalDif)}
          </p>
          <p className="text-xs text-ink-2 mt-1">
            {totalDif === 0 ? 'Todo cuadrado' : totalDif < 0 ? 'Faltante acumulado' : 'Sobrante acumulado'}
          </p>
        </div>
        <div className="bg-white border border-red-200 rounded-xl p-4 shadow-sm">
          <p className="text-xs text-ink-2 font-medium uppercase tracking-wide mb-1">Con faltante</p>
          <p className="text-xl font-bold text-danger">{conFaltante}</p>
          <p className="text-xs text-ink-2 mt-1">cierres con diferencia negativa</p>
        </div>
        <div className="bg-white border border-green-200 rounded-xl p-4 shadow-sm">
          <p className="text-xs text-ink-2 font-medium uppercase tracking-wide mb-1">Con sobrante</p>
          <p className="text-xl font-bold text-success">{conSobrante}</p>
          <p className="text-xs text-ink-2 mt-1">cierres con diferencia positiva</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white border border-border rounded-xl shadow-sm">
        <button
          onClick={() => setExpandido(v => !v)}
          className="w-full flex items-center justify-between px-5 py-3.5 text-sm font-medium text-ink hover:bg-surface-soft transition-colors rounded-xl"
        >
          <span className="flex items-center gap-2"><Filter className="w-4 h-4 text-ink-2" /> Filtros</span>
          {expandido ? <ChevronUp className="w-4 h-4 text-ink-2" /> : <ChevronDown className="w-4 h-4 text-ink-2" />}
        </button>

        {expandido && (
          <div className="px-5 pb-5 border-t border-border pt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-ink-2 uppercase tracking-wide">Desde</label>
              <input type="date" value={filtros.fecha_desde}
                onChange={e => setFiltros(p => ({ ...p, fecha_desde: e.target.value }))}
                className="w-full px-3 py-2 border border-border text-sm rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-accent/30" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-ink-2 uppercase tracking-wide">Hasta</label>
              <input type="date" value={filtros.fecha_hasta}
                onChange={e => setFiltros(p => ({ ...p, fecha_hasta: e.target.value }))}
                className="w-full px-3 py-2 border border-border text-sm rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-accent/30" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-ink-2 uppercase tracking-wide">Caja</label>
              <select value={filtros.caja_id}
                onChange={e => setFiltros(p => ({ ...p, caja_id: e.target.value }))}
                className="w-full px-3 py-2 border border-border text-sm rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-accent/30">
                <option value="">Todas</option>
                {cajas.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-ink-2 uppercase tracking-wide">Cuadratura</label>
              <select value={filtros.diferencia}
                onChange={e => setFiltros(p => ({ ...p, diferencia: e.target.value }))}
                className="w-full px-3 py-2 border border-border text-sm rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-accent/30">
                <option value="">Todos</option>
                <option value="cuadrado">Cuadrado exacto</option>
                <option value="sobrante">Con sobrante</option>
                <option value="faltante">Con faltante</option>
              </select>
            </div>
            <div className="col-span-2 md:col-span-4 flex justify-end">
              <button
                onClick={() => setFiltros({ fecha_desde: hace30, fecha_hasta: hoy, caja_id: '', cajero_id: '', diferencia: '' })}
                className="text-xs text-ink-2 hover:text-ink underline"
              >
                Limpiar filtros
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Tabla */}
      <div className="bg-white border border-border rounded-xl shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-16 text-sm text-ink-2">Cargando cierres...</div>
        ) : sesionesFiltered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-ink-2">
            <Clock className="w-10 h-10 opacity-20 mb-3" />
            <p className="text-sm font-medium">Sin cierres en este período</p>
            <p className="text-xs mt-1">Ajusta los filtros de fecha</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-surface-soft">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-ink-2 uppercase tracking-wide">Fecha cierre</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-ink-2 uppercase tracking-wide">Cajero</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-ink-2 uppercase tracking-wide hidden md:table-cell">Caja</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-ink-2 uppercase tracking-wide">Ventas</th>
                  <th className="text-right px-4 py-3 text-xs font-semibold text-ink-2 uppercase tracking-wide hidden sm:table-cell">Diferencia</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-ink-2 uppercase tracking-wide hidden lg:table-cell">Tipo</th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-ink-2 uppercase tracking-wide">Estado</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {sesionesFiltered.map(s => {
                  const badge = ESTADO_BADGE[s.estado] || { cls: 'bg-surface-soft text-ink-2', label: s.estado }
                  return (
                    <tr key={s.id} className="hover:bg-surface-soft/50 transition-colors">
                      <td className="px-4 py-3 text-ink whitespace-nowrap">
                        {fmtFecha(s.fecha_cierre)}
                      </td>
                      <td className="px-4 py-3 text-ink">
                        {s.cajero_nombre || '—'}
                      </td>
                      <td className="px-4 py-3 text-ink-2 hidden md:table-cell">
                        {s.caja_nombre || 'Sin caja'}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-ink">
                        {COP(s.total_ventas || 0)}
                      </td>
                      <td className="px-4 py-3 text-right hidden sm:table-cell">
                        <DiferenciaBadge valor={s.diferencia} />
                      </td>
                      <td className="px-4 py-3 text-center hidden lg:table-cell">
                        <span className="text-xs text-ink-2">
                          {TIPO_CIERRE_LABEL[s.tipo_cierre] || '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${badge.cls}`}>
                          {badge.label}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 justify-end">
                          {isAdminOrSup && s.estado === 'cerrada' && (
                            <button
                              onClick={() => aprobarMutation.mutate(s.id)}
                              disabled={aprobarMutation.isPending}
                              className="p-1.5 text-ink-2 hover:text-accent hover:bg-accent-soft rounded-lg transition-colors"
                              title="Aprobar"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => setSesionDetalle(s.id)}
                            className="p-1.5 text-ink-2 hover:text-ink hover:bg-surface-soft rounded-lg transition-colors"
                            title="Ver detalle"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal detalle */}
      {sesionDetalle && sesionDetalleData && (
        <DetalleSesion
          sesion={sesionDetalleData}
          onClose={() => setSesionDetalle(null)}
          onAprobar={isAdminOrSup ? (id) => aprobarMutation.mutate(id) : null}
          aprobando={aprobarMutation.isPending}
        />
      )}
    </div>
  )
}
