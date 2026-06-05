import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Search, Download, X, CreditCard, Clock, Users, AlertTriangle } from 'lucide-react'
import { carteraService } from '../services/cartera'
import { COP } from '../lib/format'
import { exportarCartera } from '../lib/exportExcel'

const METODOS_PAGO = [
  { value: 'efectivo', label: 'Efectivo' },
  { value: 'transferencia', label: 'Transferencia' },
  { value: 'tarjeta_debito', label: 'Tarjeta débito' },
  { value: 'tarjeta_credito', label: 'Tarjeta crédito' },
]

// ─── Modal Registrar Pago ─────────────────────────────────────────────────────
function ModalPago({ factura, onClose }) {
  const qc = useQueryClient()
  const [monto, setMonto] = useState('')
  const [metodo, setMetodo] = useState('efectivo')
  const [notas, setNotas] = useState('')
  const [error, setError] = useState('')

  const saldo = parseFloat(factura.saldo_pendiente || 0)

  const mutation = useMutation({
    mutationFn: carteraService.registrarPago,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['cartera'] })
      onClose()
    },
    onError: (err) => {
      setError(err?.response?.data?.message || 'Error al registrar el pago')
    },
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    setError('')
    const montoNum = parseFloat(monto)
    if (!monto || isNaN(montoNum) || montoNum <= 0) {
      setError('Ingresa un monto válido mayor a 0')
      return
    }
    if (montoNum > saldo) {
      setError(`El monto no puede superar el saldo pendiente (${COP(saldo)})`)
      return
    }
    mutation.mutate({
      factura_id: factura.id,
      monto: montoNum,
      metodo_pago: metodo,
      notas: notas.trim() || null,
    })
  }

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <h3 className="text-base font-semibold text-ink">Registrar pago</h3>
          <button onClick={onClose} className="p-1.5 text-ink-2 hover:text-ink-2 rounded-lg hover:bg-surface-soft">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Info factura */}
        <div className="px-6 py-4 bg-surface-soft border-b border-border space-y-1">
          <div className="flex justify-between text-sm">
            <span className="text-ink-2">Cliente</span>
            <span className="font-medium text-ink">{factura.cliente_nombre || '—'}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-ink-2">Factura</span>
            <span className="font-mono text-ink">{factura.numero_factura || `#${factura.id}`}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-ink-2">Saldo pendiente</span>
            <span className="font-bold text-red-600">{COP(saldo)}</span>
          </div>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          {error && (
            <div className="bg-red-50 text-red-700 text-sm px-3 py-2 rounded-lg border border-red-200">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-ink mb-1.5">
              Monto a pagar <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              min="1"
              max={saldo}
              step="1"
              value={monto}
              onChange={e => setMonto(e.target.value)}
              placeholder={`Máximo ${COP(saldo)}`}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-ink mb-1.5">
              Método de pago <span className="text-red-500">*</span>
            </label>
            <select
              value={metodo}
              onChange={e => setMetodo(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
            >
              {METODOS_PAGO.map(m => (
                <option key={m.value} value={m.value}>{m.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-ink mb-1.5">
              Notas <span className="text-ink-2 font-normal">(opcional)</span>
            </label>
            <textarea
              value={notas}
              onChange={e => setNotas(e.target.value)}
              rows={2}
              placeholder="Observaciones del pago..."
              className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 resize-none"
            />
          </div>

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-border text-ink-2 text-sm font-medium rounded-lg hover:bg-surface-soft transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={mutation.isPending}
              className="flex-1 px-4 py-2 bg-accent text-white text-sm font-medium rounded-lg hover:bg-accent/90 disabled:opacity-60 transition-colors"
            >
              {mutation.isPending ? 'Guardando...' : 'Confirmar pago'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Modal Historial de Pagos ─────────────────────────────────────────────────
function ModalHistorial({ factura, onClose }) {
  const { data: pagos, isLoading } = useQuery({
    queryKey: ['cartera-pagos', factura.id],
    queryFn: () => carteraService.getPagos(factura.id),
  })

  const lista = pagos?.pagos || pagos || []

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div>
            <h3 className="text-base font-semibold text-ink">Historial de pagos</h3>
            <p className="text-xs text-ink-2 mt-0.5">
              {factura.numero_factura || `Factura #${factura.id}`} — {factura.cliente_nombre}
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 text-ink-2 hover:text-ink-2 rounded-lg hover:bg-surface-soft">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Lista pagos */}
        <div className="px-6 py-4 max-h-96 overflow-y-auto">
          {isLoading ? (
            <p className="text-sm text-ink-2 text-center py-8">Cargando pagos...</p>
          ) : lista.length === 0 ? (
            <p className="text-sm text-ink-2 text-center py-8">Sin pagos registrados</p>
          ) : (
            <div className="space-y-3">
              {lista.map((pago, i) => (
                <div key={pago.id || i} className="flex items-start justify-between p-3 bg-surface-soft rounded-xl">
                  <div className="space-y-0.5">
                    <p className="text-sm font-semibold text-ink">{COP(pago.monto)}</p>
                    <p className="text-xs text-ink-2 capitalize">
                      {(pago.metodo_pago || '').replace(/_/g, ' ')}
                    </p>
                    {pago.notas && (
                      <p className="text-xs text-ink-2 italic">"{pago.notas}"</p>
                    )}
                    {pago.registrado_por && (
                      <p className="text-xs text-ink-2">Por: {pago.registrado_por}</p>
                    )}
                  </div>
                  <span className="text-xs text-ink-2 whitespace-nowrap ml-4 mt-0.5">
                    {pago.fecha_pago
                      ? new Date(pago.fecha_pago).toLocaleDateString('es-CO')
                      : pago.created_at
                      ? new Date(pago.created_at).toLocaleDateString('es-CO')
                      : '—'}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-border">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 border border-border text-ink-2 text-sm font-medium rounded-lg hover:bg-surface-soft transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Página principal Cartera ─────────────────────────────────────────────────
export default function Cartera() {
  const [soloVencidas, setSoloVencidas] = useState(false)
  const [busqueda, setBusqueda] = useState('')
  const [modalPago, setModalPago] = useState(null)      // factura seleccionada
  const [modalHistorial, setModalHistorial] = useState(null)

  const { data, isLoading } = useQuery({
    queryKey: ['cartera', { soloVencidas }],
    queryFn: () => carteraService.getResumen({ solo_vencidas: soloVencidas }),
  })

  const facturas = data?.facturas || data || []

  // Filtro por búsqueda de cliente
  const facturasFiltradas = busqueda.trim()
    ? facturas.filter(f =>
        (f.cliente_nombre || '').toLowerCase().includes(busqueda.toLowerCase()) ||
        (f.numero_factura || '').toLowerCase().includes(busqueda.toLowerCase()) ||
        (f.cliente_documento || '').includes(busqueda)
      )
    : facturas

  // Métricas resumen
  const totalCartera = facturasFiltradas.reduce((s, f) => s + parseFloat(f.saldo_pendiente || 0), 0)
  const carteraVencida = facturasFiltradas
    .filter(f => parseInt(f.dias_vencida || 0) > 0)
    .reduce((s, f) => s + parseFloat(f.saldo_pendiente || 0), 0)
  const clientesEnMora = new Set(
    facturasFiltradas
      .filter(f => parseInt(f.dias_vencida || 0) > 0)
      .map(f => f.cliente_id)
  ).size

  return (
    <div className="space-y-6">
      {/* Título */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-ink mb-2">Cartera</h1>
          <p className="text-ink-2">Gestiona tus créditos pendientes</p>
        </div>
        <button
          onClick={() => exportarCartera(facturasFiltradas)}
          className="flex items-center gap-1.5 px-4 py-2.5 bg-success text-white text-sm font-semibold rounded-lg hover:bg-success/90 transition-colors"
        >
          <Download className="w-4 h-4" />
          Exportar Excel
        </button>
      </div>

      {/* SECCIÓN 1 — Cards resumen */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Total cartera */}
        <div className="bg-white rounded-xl border border-border p-5 flex items-start gap-4">
          <div className="p-2.5 bg-blue-50 rounded-xl">
            <CreditCard className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <p className="text-xs text-ink-2 font-medium uppercase tracking-wide">Total cartera</p>
            <p className="text-xl font-bold text-ink mt-0.5">{COP(totalCartera)}</p>
            <p className="text-xs text-ink-2 mt-0.5">{facturasFiltradas.length} facturas pendientes</p>
          </div>
        </div>

        {/* Cartera vencida */}
        <div className="bg-white rounded-xl border border-border p-5 flex items-start gap-4">
          <div className="p-2.5 bg-red-50 rounded-xl">
            <AlertTriangle className="w-5 h-5 text-red-500" />
          </div>
          <div>
            <p className="text-xs text-ink-2 font-medium uppercase tracking-wide">Cartera vencida</p>
            <p className="text-xl font-bold text-red-600 mt-0.5">{COP(carteraVencida)}</p>
            <p className="text-xs text-ink-2 mt-0.5">
              {facturasFiltradas.filter(f => parseInt(f.dias_vencida || 0) > 0).length} facturas vencidas
            </p>
          </div>
        </div>

        {/* Clientes en mora */}
        <div className="bg-white rounded-xl border border-border p-5 flex items-start gap-4">
          <div className="p-2.5 bg-orange-50 rounded-xl">
            <Users className="w-5 h-5 text-orange-500" />
          </div>
          <div>
            <p className="text-xs text-ink-2 font-medium uppercase tracking-wide">Clientes en mora</p>
            <p className="text-xl font-bold text-orange-600 mt-0.5">{clientesEnMora}</p>
            <p className="text-xs text-ink-2 mt-0.5">con saldo vencido</p>
          </div>
        </div>
      </div>

      {/* SECCIÓN 2 — Filtros */}
      <div className="bg-white rounded-xl border border-border p-4 flex flex-wrap items-center gap-3">
        {/* Búsqueda */}
        <div className="relative flex-1 min-w-48">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-2" />
          <input
            type="text"
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
            placeholder="Buscar por cliente o factura..."
            className="w-full pl-9 pr-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
          />
        </div>

        {/* Toggle vencidas */}
        <label className="flex items-center gap-2 cursor-pointer select-none">
          <div
            onClick={() => setSoloVencidas(v => !v)}
            className={`relative w-10 h-5 rounded-full transition-colors ${soloVencidas ? 'bg-red-500' : 'bg-gray-200'}`}
          >
            <span
              className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${soloVencidas ? 'translate-x-5' : ''}`}
            />
          </div>
          <span className="text-sm text-ink-2 font-medium">Solo vencidas</span>
        </label>
      </div>

      {/* SECCIÓN 3 — Tabla */}
      <div className="bg-white rounded-xl border border-border overflow-hidden">
        {isLoading ? (
          <div className="py-16 text-center">
            <div className="inline-block w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm text-ink-2 mt-3">Cargando cartera...</p>
          </div>
        ) : facturasFiltradas.length === 0 ? (
          <div className="py-16 text-center">
            <Clock className="w-10 h-10 text-gray-200 mx-auto mb-3" />
            <p className="text-sm text-ink-2">No hay facturas de cartera</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-4 py-3 text-left text-xs font-semibold text-ink-2 uppercase tracking-wide">Cliente</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-ink-2 uppercase tracking-wide">N° Factura</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-ink-2 uppercase tracking-wide">Fecha</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-ink-2 uppercase tracking-wide">Vencimiento</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-ink-2 uppercase tracking-wide">Total</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-ink-2 uppercase tracking-wide">Pagado</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold text-ink-2 uppercase tracking-wide">Saldo</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-ink-2 uppercase tracking-wide">Estado</th>
                  <th className="px-4 py-3 text-center text-xs font-semibold text-ink-2 uppercase tracking-wide">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {facturasFiltradas.map(factura => {
                  const diasVencida = parseInt(factura.dias_vencida || 0)
                  const vencida = diasVencida > 0
                  return (
                    <tr
                      key={factura.id}
                      className={`transition-colors hover:bg-surface-soft/60 ${vencida ? 'bg-red-50/40' : ''}`}
                    >
                      <td className="px-4 py-3">
                        <p className="font-medium text-ink truncate max-w-[150px]">
                          {factura.cliente_nombre || 'Sin nombre'}
                        </p>
                        {factura.cliente_documento && (
                          <p className="text-xs text-ink-2">{factura.cliente_documento}</p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-mono text-ink text-xs">
                          {factura.numero_factura || `#${factura.id}`}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-ink-2 whitespace-nowrap">
                        {factura.fecha_emision
                          ? new Date(factura.fecha_emision).toLocaleDateString('es-CO')
                          : '—'}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {factura.fecha_vencimiento
                          ? <span className={vencida ? 'text-red-600 font-medium' : 'text-ink-2'}>
                              {new Date(factura.fecha_vencimiento).toLocaleDateString('es-CO')}
                            </span>
                          : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-ink">
                        {COP(factura.total)}
                      </td>
                      <td className="px-4 py-3 text-right text-success font-medium">
                        {COP(factura.monto_pagado || 0)}
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-accent">
                        {COP(factura.saldo_pendiente)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {vencida ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-100 text-red-700 text-xs font-semibold rounded-full">
                            {diasVencida}d vencida
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 text-xs font-semibold rounded-full">
                            Al día
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            onClick={() => setModalPago(factura)}
                            className="px-2.5 py-1 bg-accent text-white text-xs font-medium rounded-lg hover:bg-accent/90 transition-colors whitespace-nowrap"
                          >
                            Registrar pago
                          </button>
                          <button
                            onClick={() => setModalHistorial(factura)}
                            className="px-2.5 py-1 border border-border text-ink-2 text-xs font-medium rounded-lg hover:bg-surface-soft transition-colors whitespace-nowrap"
                          >
                            Ver pagos
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

      {/* Modales */}
      {modalPago && (
        <ModalPago
          factura={modalPago}
          onClose={() => setModalPago(null)}
        />
      )}
      {modalHistorial && (
        <ModalHistorial
          factura={modalHistorial}
          onClose={() => setModalHistorial(null)}
        />
      )}
    </div>
  )
}
