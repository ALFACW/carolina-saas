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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-sm text-gray-400">Cargando turno...</p>
      </div>
    )
  }

  if (isError || !sesion) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center space-y-3">
          <p className="text-sm text-gray-500">No se pudo cargar el turno</p>
          <Button variant="secondary" onClick={() => navigate('/pos')}>Volver al POS</Button>
        </div>
      </div>
    )
  }

  // Resumen por método de pago
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
      <div className="min-h-screen bg-gray-50 flex flex-col">
        <header className="bg-white border-b border-gray-100 px-6 py-4">
          <p className="text-base font-bold text-gray-900">Carolina — Cierre de turno</p>
        </header>
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="w-full max-w-md space-y-6">
            <div className="text-center">
              <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-3" />
              <h2 className="text-xl font-semibold text-gray-900">Turno cerrado</h2>
              <p className="text-sm text-gray-400 mt-1">El turno ha sido registrado correctamente</p>
            </div>

            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5 space-y-3">
              <ResumenFila label="Total ventas" valor={COP(totalVentas)} />
              <ResumenFila label="Ventas en efectivo" valor={COP(ventasEfectivo)} />
              <ResumenFila label="Fondo inicial" valor={COP(fondoInicial)} />
              <ResumenFila label="Efectivo esperado" valor={COP(efectivoEsperado)} highlight />
              <ResumenFila label="Efectivo contado" valor={COP(contado)} />
              <div className="pt-2 border-t border-gray-100">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-gray-900">Diferencia</span>
                  <span className={`text-sm font-bold flex items-center gap-1 ${
                    diff > 0 ? 'text-green-600' : diff < 0 ? 'text-red-600' : 'text-gray-500'
                  }`}>
                    {diff > 0 ? <TrendingUp className="w-4 h-4" /> : diff < 0 ? <TrendingDown className="w-4 h-4" /> : <Minus className="w-4 h-4" />}
                    {diff > 0 ? '+' : ''}{COP(diff)}
                    {diff > 0 ? ' (sobrante)' : diff < 0 ? ' (faltante)' : ' (cuadrado)'}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <Button variant="secondary" className="flex-1" onClick={handleImprimir}>
                <Printer className="w-4 h-4" />
                Imprimir
              </Button>
              <Button className="flex-1" onClick={() => navigate('/caja/abrir')}>
                Finalizar
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 px-6 py-4 flex items-center gap-3">
        <button
          onClick={() => navigate('/pos')}
          className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <p className="text-sm font-semibold text-gray-900">Cerrar turno</p>
          <p className="text-xs text-gray-400">{user?.nombre}</p>
        </div>
      </header>

      <div className="flex-1 flex items-start justify-center p-6">
        <div className="w-full max-w-lg space-y-5">
          {/* Resumen del turno */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <h2 className="text-sm font-semibold text-gray-900 mb-4">Resumen del turno</h2>

            {/* Desglose por método de pago */}
            {Object.keys(ventasPorMetodo).length > 0 ? (
              <div className="space-y-2 mb-4">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Ventas por método de pago</p>
                {Object.entries(ventasPorMetodo).map(([metodo, monto]) => (
                  <div key={metodo} className="flex justify-between text-sm">
                    <span className="text-gray-600">{METODOS_LABEL[metodo] || metodo}</span>
                    <span className="font-medium text-gray-900">{COP(Number(monto || 0))}</span>
                  </div>
                ))}
                <div className="pt-2 border-t border-gray-100 flex justify-between text-sm font-semibold">
                  <span className="text-gray-700">Total ventas</span>
                  <span className="text-gray-900">{COP(totalVentas)}</span>
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-400 mb-4">No hay ventas registradas en este turno</p>
            )}

            {/* Efectivo */}
            <div className="pt-3 border-t border-gray-100 space-y-2">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Cálculo de efectivo</p>
              <ResumenFila label="Fondo inicial" valor={COP(fondoInicial)} />
              <ResumenFila label="Ventas en efectivo" valor={`+ ${COP(ventasEfectivo)}`} />
              <ResumenFila label="Efectivo esperado" valor={COP(efectivoEsperado)} highlight />
            </div>
          </div>

          {/* Conteo físico */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
            <h2 className="text-sm font-semibold text-gray-900 mb-1">Conteo de efectivo</h2>
            <p className="text-xs text-gray-400 mb-4">Cuenta físicamente el dinero en caja e ingrésalo aquí</p>

            <form onSubmit={handleCerrar} className="space-y-4">
              <div className="space-y-1">
                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wide">
                  Efectivo contado (COP)
                </label>
                <input
                  type="number"
                  min="0"
                  step="1000"
                  value={efectivoContado}
                  onChange={(e) => setEfectivoContado(e.target.value)}
                  placeholder="0"
                  className="w-full px-3 py-2 border border-gray-200 text-sm rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-gray-900 focus:border-gray-900"
                />
                {efectivoContado !== '' && !isNaN(contado) && (
                  <p className="text-xs text-gray-400">{COP(contado)}</p>
                )}
              </div>

              {/* Diferencia en tiempo real */}
              {efectivoContado !== '' && !isNaN(contado) && (
                <div className={`flex items-center justify-between px-4 py-3 rounded-lg text-sm font-semibold ${
                  diferencia > 0
                    ? 'bg-green-50 text-green-700'
                    : diferencia < 0
                    ? 'bg-red-50 text-red-700'
                    : 'bg-gray-50 text-gray-600'
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
                <p className="text-xs text-red-500">
                  {cerrarMutation.error?.response?.data?.message || 'Error al cerrar el turno'}
                </p>
              )}

              <Button
                type="submit"
                className="w-full"
                size="lg"
                loading={cerrarMutation.isPending}
                disabled={efectivoContado === ''}
              >
                Cerrar mi turno
              </Button>
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
      <span className={highlight ? 'text-gray-900' : 'text-gray-600'}>{label}</span>
      <span className={highlight ? 'text-gray-900' : 'text-gray-700'}>{valor}</span>
    </div>
  )
}
