import React, { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { ArrowLeft, Printer, CheckCircle, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { cajasService } from '../services/cajas'
import { useAuth } from '../context/AuthContext'
import { Button } from '../components/Common/Button'
import { COP } from '../lib/format'

const METODOS_LABEL = {
  efectivo: 'Efectivo',
  tarjeta:  'Tarjeta',
  transferencia: 'Transferencia',
  nequi:    'Nequi',
  daviplata: 'Daviplata',
}

export default function CerrarCaja() {
  const { sesionId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()

  const [efectivoContado, setEfectivoContado] = useState('')
  const [cerrada, setCerrada] = useState(false)
  const [resultadoCierre, setResultadoCierre] = useState(null)

  const { data: sesion, isLoading, isError } = useQuery({
    queryKey: ['sesion', sesionId],
    queryFn: () => cajasService.getSesion(sesionId),
    enabled: !!sesionId,
  })

  const cerrarMutation = useMutation({
    mutationFn: (datos) => cajasService.cerrarSesion(sesionId, datos),
    onSuccess: (data) => {
      setResultadoCierre(data)
      setCerrada(true)
    },
  })

  if (isLoading) {
    return (
      <div className="min-h-screen bg-surface-soft flex items-center justify-center">
        <p className="text-sm text-ink-2">Cargando turno...</p>
      </div>
    )
  }

  if (isError || !sesion) {
    return (
      <div className="min-h-screen bg-surface-soft flex items-center justify-center">
        <div className="text-center space-y-3">
          <p className="text-sm text-ink-2">No se pudo cargar el turno</p>
          <button
            onClick={() => navigate('/pos')}
            className="border border-border hover:bg-surface-soft text-ink font-medium px-4 py-2.5 rounded-lg text-sm transition-colors"
          >
            Volver al POS
          </button>
        </div>
      </div>
    )
  }

  const ventasPorMetodo = sesion.ventas_por_metodo || {}
  const totalVentas = Object.values(ventasPorMetodo).reduce((a, b) => a + Number(b || 0), 0)
  const ventasEfectivo = Number(ventasPorMetodo.efectivo || 0)
  const fondoInicial = Number(sesion.fondo_inicial || 0)
  const efectivoEsperado = fondoInicial + ventasEfectivo

  const contado = Number(efectivoContado) || 0
  const diferencia = contado - efectivoEsperado

  const handleCerrar = (e) => {
    e.preventDefault()
    if (efectivoContado === '') return
    cerrarMutation.mutate({ efectivo_contado: contado })
  }

  const handleImprimir = () => window.print()

  // Pantalla de resultado post-cierre
  if (cerrada) {
    const diff = Number(resultadoCierre?.diferencia ?? diferencia)
    return (
      <div className="min-h-screen bg-surface-soft flex flex-col">
        <header className="bg-white border-b border-border px-6 py-4">
          <div className="flex items-center gap-3">
            <span className="w-9 h-9 rounded-full bg-accent flex items-center justify-center font-brand font-bold text-lg text-white">C</span>
            <span className="font-brand font-semibold text-base text-ink flex items-center">
              Carolina<span className="bg-accent text-white font-bold text-xs px-2 py-0.5 rounded-md ml-1.5">POS</span>
            </span>
            <span className="text-sm text-ink-2 ml-2">— Cierre de turno</span>
          </div>
        </header>
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="w-full max-w-md space-y-6">
            <div className="text-center">
              <div className="w-14 h-14 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-3 border border-green-200">
                <CheckCircle className="w-8 h-8 text-success" />
              </div>
              <h2 className="text-xl font-semibold text-ink">Turno cerrado</h2>
              <p className="text-sm text-ink-2 mt-1">El turno ha sido registrado correctamente</p>
            </div>

            <div className="bg-white rounded-xl border border-border shadow-sm p-5 space-y-3">
              <ResumenFila label="Total ventas" valor={COP(totalVentas)} />
              <ResumenFila label="Ventas en efectivo" valor={COP(ventasEfectivo)} />
              <ResumenFila label="Fondo inicial" valor={COP(fondoInicial)} />
              <ResumenFila label="Efectivo esperado" valor={COP(efectivoEsperado)} highlight />
              <ResumenFila label="Efectivo contado" valor={COP(contado)} />
              <div className="pt-2 border-t border-border">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-ink">Diferencia</span>
                  <span className={`text-sm font-bold flex items-center gap-1 ${diff > 0 ? 'text-success' : diff < 0 ? 'text-danger' : 'text-ink-2'}`}>
                    {diff > 0 ? <TrendingUp className="w-4 h-4" /> : diff < 0 ? <TrendingDown className="w-4 h-4" /> : <Minus className="w-4 h-4" />}
                    {diff > 0 ? '+' : ''}{COP(diff)}
                    {diff > 0 ? ' (sobrante)' : diff < 0 ? ' (faltante)' : ' (cuadrado)'}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleImprimir}
                className="flex-1 flex items-center justify-center gap-2 border border-border hover:bg-surface-soft text-ink font-medium px-4 py-2.5 rounded-lg text-sm transition-colors"
              >
                <Printer className="w-4 h-4" />
                Imprimir
              </button>
              <button
                onClick={() => navigate('/caja/abrir')}
                className="flex-1 bg-accent hover:bg-accent/90 text-white font-semibold px-4 py-2.5 rounded-lg text-sm transition-colors"
              >
                Finalizar
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-surface-soft flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-border px-6 py-4 flex items-center gap-3">
        <button
          onClick={() => navigate('/pos')}
          className="p-1.5 text-ink-2 hover:text-ink hover:bg-surface-soft rounded-lg transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <p className="text-sm font-semibold text-ink">Cerrar turno</p>
          <p className="text-xs text-ink-2">{user?.nombre}</p>
        </div>
      </header>

      <div className="flex-1 flex items-start justify-center p-6">
        <div className="w-full max-w-lg space-y-5">

          {/* Resumen del turno */}
          <div className="bg-white rounded-xl border border-border shadow-sm p-5">
            <h2 className="text-base font-semibold text-ink mb-4">Resumen del turno</h2>

            {Object.keys(ventasPorMetodo).length > 0 ? (
              <div className="space-y-2 mb-4">
                <p className="text-xs font-semibold text-ink-2 uppercase tracking-wide mb-2">Ventas por método de pago</p>
                {Object.entries(ventasPorMetodo).map(([metodo, monto]) => (
                  <div key={metodo} className="flex justify-between text-sm">
                    <span className="text-ink-2">{METODOS_LABEL[metodo] || metodo}</span>
                    <span className="font-medium text-ink">{COP(Number(monto || 0))}</span>
                  </div>
                ))}
                <div className="pt-2 border-t border-border flex justify-between text-sm font-semibold">
                  <span className="text-ink">Total ventas</span>
                  <span className="text-accent">{COP(totalVentas)}</span>
                </div>
              </div>
            ) : (
              <p className="text-sm text-ink-2 mb-4">No hay ventas registradas en este turno</p>
            )}

            <div className="pt-3 border-t border-border space-y-2">
              <p className="text-xs font-semibold text-ink-2 uppercase tracking-wide mb-2">Cálculo de efectivo</p>
              <ResumenFila label="Fondo inicial" valor={COP(fondoInicial)} />
              <ResumenFila label="Ventas en efectivo" valor={`+ ${COP(ventasEfectivo)}`} />
              <ResumenFila label="Efectivo esperado" valor={COP(efectivoEsperado)} highlight />
            </div>
          </div>

          {/* Conteo físico */}
          <div className="bg-white rounded-xl border border-border shadow-sm p-5">
            <h2 className="text-base font-semibold text-ink mb-1">Conteo de efectivo</h2>
            <p className="text-xs text-ink-2 mb-4">Cuenta físicamente el dinero en caja e ingrésalo aquí</p>

            <form onSubmit={handleCerrar} className="space-y-4">
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-ink">Efectivo contado (COP)</label>
                <input
                  type="number"
                  min="0"
                  step="1000"
                  value={efectivoContado}
                  onChange={(e) => setEfectivoContado(e.target.value)}
                  placeholder="0"
                  className="w-full px-3 py-2.5 border border-border rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-colors"
                />
                {efectivoContado !== '' && !isNaN(contado) && (
                  <p className="text-xs text-ink-2">{COP(contado)}</p>
                )}
              </div>

              {/* Diferencia en tiempo real */}
              {efectivoContado !== '' && !isNaN(contado) && (
                <div className={`flex items-center justify-between px-4 py-3 rounded-xl text-sm font-semibold border ${
                  diferencia > 0
                    ? 'bg-green-50 text-success border-green-200'
                    : diferencia < 0
                    ? 'bg-red-50 text-danger border-red-200'
                    : 'bg-surface-soft text-ink-2 border-border'
                }`}>
                  <span>
                    {diferencia > 0 ? 'Sobrante' : diferencia < 0 ? 'Faltante' : 'Cuadrado exacto'}
                  </span>
                  <span className="flex items-center gap-1">
                    {diferencia > 0 ? <TrendingUp className="w-4 h-4" /> : diferencia < 0 ? <TrendingDown className="w-4 h-4" /> : <Minus className="w-4 h-4" />}
                    {diferencia > 0 ? '+' : ''}{COP(diferencia)}
                  </span>
                </div>
              )}

              {cerrarMutation.isError && (
                <p className="text-xs text-danger">
                  {cerrarMutation.error?.response?.data?.message || 'Error al cerrar el turno'}
                </p>
              )}

              <button
                type="submit"
                disabled={cerrarMutation.isPending || efectivoContado === ''}
                className={`w-full flex items-center justify-center gap-2 font-semibold px-4 py-3 rounded-lg text-sm transition-colors disabled:opacity-50 ${
                  diferencia !== 0 && efectivoContado !== ''
                    ? 'bg-danger hover:bg-danger/90 text-white'
                    : 'bg-accent hover:bg-accent/90 text-white'
                }`}
              >
                {cerrarMutation.isPending ? 'Cerrando turno...' : 'Cerrar mi turno'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}

function ResumenFila({ label, valor, highlight }) {
  return (
    <div className={`flex justify-between text-sm ${highlight ? 'font-semibold' : ''}`}>
      <span className={highlight ? 'text-ink' : 'text-ink-2'}>{label}</span>
      <span className={highlight ? 'text-ink' : 'text-ink'}>{valor}</span>
    </div>
  )
}
