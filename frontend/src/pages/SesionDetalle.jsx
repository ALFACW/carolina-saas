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
  abierta:  'bg-green-100 text-green-700',
  cerrada:  'bg-yellow-100 text-yellow-700',
  aprobada: 'bg-blue-100 text-blue-700',
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
      <div className="p-6">
        <div className="text-sm text-gray-400">Cargando...</div>
      </div>
    )
  }

  if (isError || !sesion) {
    return (
      <div className="p-6 space-y-4">
        <p className="text-sm text-gray-500">No se pudo cargar la sesión</p>
        <Button variant="secondary" onClick={() => navigate('/cajas')}>Volver</Button>
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
          className="text-gray-900 hover:underline font-medium flex items-center gap-1"
        >
          <FileText className="w-3.5 h-3.5 text-gray-400" />
          {val || '—'}
        </Link>
      ),
    },
    { key: 'cliente', label: 'Cliente', render: (_, r) => r.cliente?.nombre || r.cliente_nombre || 'Consumidor final' },
    {
      key: 'metodo_pago',
      label: 'Método',
      render: (val) => (
        <span className="text-xs capitalize">{METODOS_LABEL[val] || val || '—'}</span>
      ),
    },
    {
      key: 'total',
      label: 'Total',
      render: (val) => <span className="font-medium">{COP(val || 0)}</span>,
    },
    {
      key: 'created_at',
      label: 'Hora',
      render: (val) => val ? new Date(val).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }) : '—',
    },
  ]

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start gap-3">
        <button
          onClick={() => navigate('/cajas')}
          className="mt-0.5 p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-semibold text-gray-900">Detalle del turno</h1>
            {sesion.estado && (
              <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium capitalize ${ESTADO_BADGE[sesion.estado] || 'bg-gray-100 text-gray-600'}`}>
                {sesion.estado}
              </span>
            )}
          </div>
          <p className="text-sm text-gray-400 mt-0.5">
            {sesion.usuario?.nombre || sesion.cajero?.nombre || '—'} · {sesion.caja?.nombre || 'Caja principal'}
          </p>
        </div>
        {sesion.estado === 'cerrada' && (
          <Button
            onClick={() => aprobarMutation.mutate()}
            loading={aprobarMutation.isPending}
          >
            <CheckCircle className="w-4 h-4" />
            Aprobar cuadratura
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Info del turno */}
        <div className="bg-white rounded-lg border border-gray-100 p-5 space-y-3">
          <h2 className="text-sm font-semibold text-gray-900">Información del turno</h2>
          <InfoFila label="Cajero" valor={sesion.usuario?.nombre || sesion.cajero?.nombre || '—'} />
          <InfoFila label="Caja" valor={sesion.caja?.nombre || 'Caja principal'} />
          <InfoFila label="Apertura" valor={formatFecha(sesion.fecha_apertura)} />
          <InfoFila label="Cierre" valor={formatFecha(sesion.fecha_cierre)} />
          {sesion.fecha_apertura && sesion.fecha_cierre && (
            <InfoFila
              label="Duración"
              valor={duracion(sesion.fecha_apertura, sesion.fecha_cierre)}
            />
          )}
        </div>

        {/* Cuadratura de efectivo */}
        <div className="bg-white rounded-lg border border-gray-100 p-5 space-y-3">
          <h2 className="text-sm font-semibold text-gray-900">Cuadratura de efectivo</h2>
          <InfoFila label="Fondo inicial" valor={COP(fondoInicial)} />
          <InfoFila label="Ventas en efectivo" valor={COP(ventasEfectivo)} />
          <InfoFila label="Efectivo esperado" valor={COP(efectivoEsperado)} highlight />
          {efectivoContado !== null ? (
            <>
              <InfoFila label="Efectivo contado" valor={COP(efectivoContado)} />
              <div className="pt-2 border-t border-gray-100">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-gray-900">Diferencia</span>
                  <span className={`text-sm font-bold flex items-center gap-1 ${
                    diferencia > 0 ? 'text-green-600' : diferencia < 0 ? 'text-red-600' : 'text-gray-500'
                  }`}>
                    {diferencia > 0 ? <TrendingUp className="w-4 h-4" /> : diferencia < 0 ? <TrendingDown className="w-4 h-4" /> : <Minus className="w-4 h-4" />}
                    {diferencia > 0 ? '+' : ''}{COP(diferencia)}
                    {diferencia > 0 ? ' (sobrante)' : diferencia < 0 ? ' (faltante)' : ' (cuadrado)'}
                  </span>
                </div>
              </div>
            </>
          ) : (
            <p className="text-xs text-gray-400 italic">Aún no se ha realizado el conteo</p>
          )}
        </div>
      </div>

      {/* Ventas por método de pago */}
      <div className="bg-white rounded-lg border border-gray-100 p-5">
        <h2 className="text-sm font-semibold text-gray-900 mb-4">Ventas por método de pago</h2>
        {Object.keys(ventasPorMetodo).length > 0 ? (
          <div className="space-y-2">
            {Object.entries(ventasPorMetodo).map(([metodo, monto]) => (
              <div key={metodo} className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0">
                <span className="text-sm text-gray-600">{METODOS_LABEL[metodo] || metodo}</span>
                <span className="text-sm font-medium text-gray-900">{COP(Number(monto || 0))}</span>
              </div>
            ))}
            <div className="flex items-center justify-between pt-2">
              <span className="text-sm font-semibold text-gray-900">Total ventas</span>
              <span className="text-sm font-bold text-gray-900">{COP(totalVentas)}</span>
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-400">No hay ventas en este turno</p>
        )}
      </div>

      {/* Facturas del turno */}
      {sesion.facturas && sesion.facturas.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-gray-900">
            Facturas del turno
            <span className="ml-2 text-xs font-normal text-gray-400">({sesion.facturas.length} transacciones)</span>
          </h2>
          <Table
            columns={columnasFacturas}
            data={sesion.facturas}
            emptyMessage="Sin facturas"
          />
        </div>
      )}

      {aprobarMutation.isError && (
        <p className="text-xs text-red-500">
          {aprobarMutation.error?.response?.data?.message || 'Error al aprobar'}
        </p>
      )}
      {aprobarMutation.isSuccess && (
        <p className="text-xs text-green-600">Cuadratura aprobada correctamente</p>
      )}
    </div>
  )
}

function InfoFila({ label, valor, highlight }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-gray-500">{label}</span>
      <span className={highlight ? 'font-semibold text-gray-900' : 'text-gray-700'}>{valor}</span>
    </div>
  )
}

function duracion(desde, hasta) {
  const ms = new Date(hasta) - new Date(desde)
  if (ms < 0) return '—'
  const h = Math.floor(ms / 3600000)
  const m = Math.floor((ms % 3600000) / 60000)
  return `${h}h ${m}m`
}
