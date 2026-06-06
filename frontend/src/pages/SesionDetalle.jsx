import React from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, CheckCircle, TrendingUp, TrendingDown, Minus, FileText } from 'lucide-react'
import { cajasService } from '../services/cajas'
import { Table } from '../components/Common/Table'
import { Button } from '../components/Common/Button'
import { COP } from '../lib/format'

const METODOS_LABEL = {
  efectivo:      'Efectivo',
  tarjeta:       'Tarjeta',
  transferencia: 'Transferencia',
  nequi:         'Nequi',
  daviplata:     'Daviplata',
}

const ESTADO_BADGE = {
  abierta:  'bg-green-50 text-success border border-green-200',
  cerrada:  'bg-yellow-50 text-warning border border-yellow-200',
  aprobada: 'bg-accent-soft text-accent border border-accent/20',
}

export default function SesionDetalle() {
  const { id } = useParams()
  const navigate = useNavigate()
  const qc = useQueryClient()

  const { data: sesion, isLoading, isError } = useQuery({
    queryKey: ['sesion', id],
    queryFn: () => cajasService.getSesion(id),
    enabled: !!id,
  })

  const aprobarMutation = useMutation({
    mutationFn: () => cajasService.aprobarSesion(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sesion', id] })
      qc.invalidateQueries({ queryKey: ['sesiones'] })
    },
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-sm text-ink-2">Cargando...</div>
      </div>
    )
  }

  if (isError || !sesion) {
    return (
      <div className="space-y-6">
        <button onClick={() => navigate('/cajas')} className="flex items-center gap-2 text-sm text-ink-2 hover:text-ink w-fit transition-colors">
          <ArrowLeft className="w-4 h-4" />Volver a cajas
        </button>
        <p className="text-sm text-ink-2">No se pudo cargar la sesión</p>
      </div>
    )
  }

  const ventasPorMetodo = sesion.ventas_por_metodo || {}
  const totalVentas = Object.values(ventasPorMetodo).reduce((a, b) => a + Number(b || 0), 0)
  const fondoInicial = Number(sesion.fondo_inicial || 0)
  const ventasEfectivo = Number(ventasPorMetodo.efectivo || 0)
  const efectivoEsperado = fondoInicial + ventasEfectivo
  const efectivoContado = sesion.efectivo_contado !== undefined ? Number(sesion.efectivo_contado) : null
  const diferencia = efectivoContado !== null ? efectivoContado - efectivoEsperado : null

  const formatFecha = (f) => {
    if (!f) return '—'
    return new Date(f).toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' })
  }

  const columnasFacturas = [
    {
      key: 'numero',
      label: 'Número',
      render: (val, row) => (
        <Link
          to={`/facturas/${row.id || row._id}`}
          className="text-accent hover:underline font-medium flex items-center gap-1"
        >
          <FileText className="w-3.5 h-3.5" />
          {val || '—'}
        </Link>
      ),
    },
    { key: 'cliente', label: 'Cliente', render: (_, r) => r.cliente?.nombre || r.cliente_nombre || 'Consumidor final' },
    {
      key: 'metodo_pago',
      label: 'Método',
      render: (val) => <span className="text-xs capitalize text-ink-2">{METODOS_LABEL[val] || val || '—'}</span>,
    },
    {
      key: 'total',
      label: 'Total',
      render: (val) => <span className="font-medium text-ink">{COP(val || 0)}</span>,
    },
    {
      key: 'created_at',
      label: 'Hora',
      render: (val) => val ? new Date(val).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }) : '—',
    },
  ]

  return (
    <div className="space-y-6">

        {/* Header con Volver integrado */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/cajas')}
              className="p-2 hover:bg-surface-soft rounded-lg transition-colors text-ink-2"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <div>
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl font-bold text-ink">Detalle del turno</h1>
                {sesion.estado && (
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${ESTADO_BADGE[sesion.estado] || 'bg-surface-soft text-ink-2'}`}>
                    {sesion.estado}
                  </span>
                )}
              </div>
              <p className="text-sm text-ink-2 mt-0.5">
                {sesion.usuario?.nombre || sesion.cajero?.nombre || '—'} · {sesion.caja?.nombre || 'Caja principal'}
              </p>
            </div>
          </div>
          {sesion.estado === 'cerrada' && (
            <button
              onClick={() => aprobarMutation.mutate()}
              disabled={aprobarMutation.isPending}
              className="flex items-center gap-2 bg-accent hover:bg-accent/90 text-white font-semibold px-4 py-2.5 rounded-lg text-sm transition-colors disabled:opacity-50 whitespace-nowrap"
            >
              <CheckCircle className="w-4 h-4" />
              {aprobarMutation.isPending ? 'Aprobando...' : 'Aprobar cuadratura'}
            </button>
          )}
        </div>

        {/* KPI cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-xl border border-border shadow-sm p-5">
            <p className="text-xs font-semibold text-ink-2 uppercase tracking-wide mb-1">Saldo inicial</p>
            <p className="text-2xl font-bold text-ink">{COP(fondoInicial)}</p>
          </div>
          <div className="bg-white rounded-xl border border-border shadow-sm p-5">
            <p className="text-xs font-semibold text-ink-2 uppercase tracking-wide mb-1">Total ventas</p>
            <p className="text-2xl font-bold text-accent">{COP(totalVentas)}</p>
          </div>
          {diferencia !== null ? (
            <div className={`rounded-xl border shadow-sm p-5 ${diferencia > 0 ? 'bg-green-50 border-green-200' : diferencia < 0 ? 'bg-red-50 border-red-200' : 'bg-white border-border'}`}>
              <p className="text-xs font-semibold text-ink-2 uppercase tracking-wide mb-1">Diferencia</p>
              <p className={`text-2xl font-bold flex items-center gap-2 ${diferencia > 0 ? 'text-success' : diferencia < 0 ? 'text-danger' : 'text-ink-2'}`}>
                {diferencia > 0 ? <TrendingUp className="w-5 h-5" /> : diferencia < 0 ? <TrendingDown className="w-5 h-5" /> : <Minus className="w-5 h-5" />}
                {diferencia > 0 ? '+' : ''}{COP(diferencia)}
              </p>
              <p className="text-xs text-ink-2 mt-1">
                {diferencia > 0 ? 'Sobrante' : diferencia < 0 ? 'Faltante' : 'Cuadrado exacto'}
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-border shadow-sm p-5">
              <p className="text-xs font-semibold text-ink-2 uppercase tracking-wide mb-1">Diferencia</p>
              <p className="text-sm text-ink-2 italic mt-2">Sin conteo aún</p>
            </div>
          )}
        </div>

        {/* Info + Cuadratura */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="bg-white rounded-xl border border-border shadow-sm p-5 space-y-3">
            <h2 className="text-sm font-semibold text-ink">Información del turno</h2>
            <InfoFila label="Cajero" valor={sesion.usuario?.nombre || sesion.cajero?.nombre || '—'} />
            <InfoFila label="Caja" valor={sesion.caja?.nombre || 'Caja principal'} />
            <InfoFila label="Apertura" valor={formatFecha(sesion.fecha_apertura)} />
            <InfoFila label="Cierre" valor={formatFecha(sesion.fecha_cierre)} />
            {sesion.fecha_apertura && sesion.fecha_cierre && (
              <InfoFila label="Duración" valor={duracion(sesion.fecha_apertura, sesion.fecha_cierre)} />
            )}
          </div>

          <div className="bg-white rounded-xl border border-border shadow-sm p-5 space-y-3">
            <h2 className="text-sm font-semibold text-ink">Cuadratura de efectivo</h2>
            <InfoFila label="Fondo inicial" valor={COP(fondoInicial)} />
            <InfoFila label="Ventas en efectivo" valor={COP(ventasEfectivo)} />
            <InfoFila label="Efectivo esperado" valor={COP(efectivoEsperado)} highlight />
            {efectivoContado !== null ? (
              <>
                <InfoFila label="Efectivo contado" valor={COP(efectivoContado)} />
                <div className="pt-2 border-t border-border">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-ink">Diferencia</span>
                    <span className={`text-sm font-bold flex items-center gap-1 ${diferencia > 0 ? 'text-success' : diferencia < 0 ? 'text-danger' : 'text-ink-2'}`}>
                      {diferencia > 0 ? <TrendingUp className="w-4 h-4" /> : diferencia < 0 ? <TrendingDown className="w-4 h-4" /> : <Minus className="w-4 h-4" />}
                      {diferencia > 0 ? '+' : ''}{COP(diferencia)}
                      {diferencia > 0 ? ' (sobrante)' : diferencia < 0 ? ' (faltante)' : ' (cuadrado)'}
                    </span>
                  </div>
                </div>
              </>
            ) : (
              <p className="text-xs text-ink-2 italic">Aún no se ha realizado el conteo</p>
            )}
          </div>
        </div>

        {/* Ventas por método */}
        <div className="bg-white rounded-xl border border-border shadow-sm p-5">
          <h2 className="text-sm font-semibold text-ink mb-4">Ventas por método de pago</h2>
          {Object.keys(ventasPorMetodo).length > 0 ? (
            <div className="space-y-2">
              {Object.entries(ventasPorMetodo).map(([metodo, monto]) => (
                <div key={metodo} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                  <span className="text-sm text-ink-2">{METODOS_LABEL[metodo] || metodo}</span>
                  <span className="text-sm font-medium text-ink">{COP(Number(monto || 0))}</span>
                </div>
              ))}
              <div className="flex items-center justify-between pt-2">
                <span className="text-sm font-semibold text-ink">Total ventas</span>
                <span className="text-sm font-bold text-accent">{COP(totalVentas)}</span>
              </div>
            </div>
          ) : (
            <p className="text-sm text-ink-2">No hay ventas en este turno</p>
          )}
        </div>

        {/* Facturas del turno */}
        {sesion.facturas && sesion.facturas.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-base font-semibold text-ink">
              Ventas del turno{' '}
              <span className="text-sm font-normal text-ink-2">({sesion.facturas.length} transacciones)</span>
            </h2>
            <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
              <Table columns={columnasFacturas} data={sesion.facturas} emptyMessage="Sin facturas" />
            </div>
          </div>
        )}

        {aprobarMutation.isError && (
          <p className="text-xs text-danger">
            {aprobarMutation.error?.response?.data?.message || 'Error al aprobar'}
          </p>
        )}
        {aprobarMutation.isSuccess && (
          <p className="text-xs text-success">Cuadratura aprobada correctamente</p>
        )}
    </div>
  )
}

function InfoFila({ label, valor, highlight }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-ink-2">{label}</span>
      <span className={highlight ? 'font-semibold text-ink' : 'text-ink'}>{valor}</span>
    </div>
  )
}

function duracion(desde, hasta) {
  if (!hasta) return '—'
  const ms = new Date(hasta) - new Date(desde)
  if (ms < 0) return '—'
  const h = Math.floor(ms / 3600000)
  const minutos = Math.max(0, Math.round((ms % 3600000) / 60000))
  return `${h}h ${minutos}m`
}
