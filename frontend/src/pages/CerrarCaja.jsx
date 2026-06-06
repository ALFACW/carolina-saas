import React, { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { ArrowLeft, Printer, CheckCircle, TrendingUp, TrendingDown, Minus, Users, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { cajasService } from '../services/cajas'
import { useAuth } from '../context/AuthContext'
import { useTenant } from '../hooks/useTenant'
import { useLocalPrint } from '../hooks/useLocalPrint'
import { buildTicketCierre } from '../lib/escpos'
import { Button } from '../components/Common/Button'
import { COP } from '../lib/format'

const METODOS_LABEL = {
  efectivo: 'Efectivo', tarjeta: 'Tarjeta',
  transferencia: 'Transferencia', nequi: 'Nequi', daviplata: 'Daviplata',
}

export default function CerrarCaja() {
  const { sesionId } = useParams()
  const navigate     = useNavigate()
  const { user }     = useAuth()
  const { tenant }   = useTenant()
  const localPrint   = useLocalPrint()

  const [efectivoContado, setEfectivoContado] = useState('')
  const [cerrada,         setCerrada]         = useState(false)
  const [resultadoCierre, setResultadoCierre] = useState(null)
  const [imprimiendo,     setImprimiendo]     = useState(false)

  // Modo turnos — campos extra
  const [cajeroEntrante,  setCajeroEntrante]  = useState(false)
  const [fondoSiguiente,  setFondoSiguiente]  = useState('')

  const modTurnos = tenant?.modo_turnos === true

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
      // Imprimir automáticamente si hay impresora configurada
      handleImprimir(data)
    },
    onError: (err) => toast.error(err?.response?.data?.message || 'Error al cerrar el turno'),
  })

  const ventasPorMetodo = sesion?.ventas_por_metodo || {}
  const totalVentas     = Object.values(ventasPorMetodo).reduce((a, b) => a + Number(b || 0), 0)
  const ventasEfectivo  = Number(ventasPorMetodo.efectivo || 0)
  const fondoInicial    = Number(sesion?.fondo_inicial || 0)
  const efectivoEsperado = fondoInicial + ventasEfectivo

  const contado    = Number(efectivoContado) || 0
  const diferencia = contado - efectivoEsperado

  const handleCerrar = (e) => {
    e.preventDefault()
    if (efectivoContado === '') return
    const datos = {
      efectivo_contado: contado,
      tipo_cierre:      modTurnos && cajeroEntrante ? 'cambio_turno' : 'cierre_final',
      fondo_siguiente:  modTurnos && cajeroEntrante ? (Number(fondoSiguiente) || 0) : 0,
    }
    cerrarMutation.mutate(datos)
  }

  const handleImprimir = async (data = resultadoCierre) => {
    if (!data || !localPrint.impTermica) return
    setImprimiendo(true)
    try {
      const sesionParaTicket = {
        ...sesion,
        ...data.sesion,
        cajero_nombre:    user?.nombre,
        total_efectivo:   data.resumen?.ventas_efectivo ?? 0,
        total_tarjeta:    data.resumen?.total_tarjeta   ?? 0,
        total_transferencia: data.resumen?.total_transferencia ?? 0,
        total_credito:    data.resumen?.total_credito   ?? 0,
        total_ventas:     data.resumen?.total_ventas    ?? 0,
        efectivo_contado: data.resumen?.efectivo_contado ?? contado,
        diferencia:       data.resumen?.diferencia      ?? diferencia,
        num_facturas:     data.resumen?.num_facturas    ?? 0,
        tipo_cierre:      data.sesion?.tipo_cierre      ?? 'cierre_final',
        fondo_siguiente:  data.sesion?.fondo_siguiente  ?? 0,
      }
      const empresa = {
        nombre:   tenant?.nombre,
        nit:      tenant?.nit,
        direccion: tenant?.direccion,
        telefono: tenant?.telefono,
      }
      const W = localPrint.anchoPapel === '58' ? 32 : 48
      const ticket = buildTicketCierre({
        empresa, sesion: sesionParaTicket,
        W, densidad: localPrint.densidad,
        avancePapel: localPrint.avancePapel,
        modoCortePapel: localPrint.modoCortePapel,
      })
      await localPrint.imprimirTicket(ticket)
      toast.success('Corte impreso correctamente')
    } catch (err) {
      toast.error('No se pudo imprimir: ' + (err.message || 'Error'))
    } finally {
      setImprimiendo(false)
    }
  }

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
          <button onClick={() => navigate('/pos')}
            className="border border-border hover:bg-surface-soft text-ink font-medium px-4 py-2.5 rounded-lg text-sm transition-colors">
            Volver al POS
          </button>
        </div>
      </div>
    )
  }

  // ── Pantalla de resultado post-cierre ──────────────────────────
  if (cerrada && resultadoCierre) {
    const diff = Number(resultadoCierre.diferencia ?? resultadoCierre.resumen?.diferencia ?? diferencia)
    const esCambioTurno = resultadoCierre.sesion?.tipo_cierre === 'cambio_turno'

    return (
      <div className="min-h-screen bg-surface-soft flex flex-col">
        <header className="bg-white border-b border-border px-6 py-4">
          <div className="flex items-center gap-3">
            <span className="w-9 h-9 rounded-full bg-accent flex items-center justify-center font-brand font-bold text-lg text-white">C</span>
            <span className="font-brand font-semibold text-base text-ink flex items-center">
              Carolina<span className="bg-accent text-white font-bold text-xs px-2 py-0.5 rounded-md ml-1.5">POS</span>
            </span>
            <span className="text-sm text-ink-2 ml-2">— {esCambioTurno ? 'Cambio de turno' : 'Corte de caja'}</span>
          </div>
        </header>

        <div className="flex-1 flex items-center justify-center p-6">
          <div className="w-full max-w-md space-y-6">
            <div className="text-center">
              <div className="w-14 h-14 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-3 border border-green-200">
                <CheckCircle className="w-8 h-8 text-success" />
              </div>
              <h2 className="text-xl font-semibold text-ink">
                {esCambioTurno ? 'Cambio de turno registrado' : 'Caja cerrada'}
              </h2>
              <p className="text-sm text-ink-2 mt-1">El turno ha sido registrado correctamente</p>
            </div>

            <div className="bg-white rounded-xl border border-border shadow-sm p-5 space-y-3">
              <ResumenFila label="Total ventas"      valor={COP(resultadoCierre.resumen?.total_ventas ?? totalVentas)} />
              <ResumenFila label="Ventas en efectivo" valor={COP(resultadoCierre.resumen?.ventas_efectivo ?? ventasEfectivo)} />
              <ResumenFila label="Fondo inicial"     valor={COP(fondoInicial)} />
              <ResumenFila label="Efectivo esperado" valor={COP(efectivoEsperado)} highlight />
              <ResumenFila label="Efectivo contado"  valor={COP(resultadoCierre.resumen?.efectivo_contado ?? contado)} />
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
              {esCambioTurno && parseFloat(resultadoCierre.sesion?.fondo_siguiente || 0) > 0 && (
                <div className="pt-2 border-t border-border flex justify-between text-sm">
                  <span className="text-ink-2">Fondo para siguiente cajero</span>
                  <span className="font-semibold text-ink">{COP(resultadoCierre.sesion.fondo_siguiente)}</span>
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => handleImprimir()}
                disabled={imprimiendo || !localPrint.impTermica}
                className="flex-1 flex items-center justify-center gap-2 border border-border hover:bg-surface-soft text-ink font-medium px-4 py-2.5 rounded-lg text-sm transition-colors disabled:opacity-40"
                title={!localPrint.impTermica ? 'Configura una impresora en Configuración' : ''}
              >
                {imprimiendo ? <Loader2 className="w-4 h-4 animate-spin" /> : <Printer className="w-4 h-4" />}
                {imprimiendo ? 'Imprimiendo...' : 'Reimprimir corte'}
              </button>
              <button
                onClick={() => navigate('/caja/abrir')}
                className="flex-1 bg-accent hover:bg-accent/90 text-white font-semibold px-4 py-2.5 rounded-lg text-sm transition-colors"
              >
                {esCambioTurno ? 'Siguiente cajero' : 'Finalizar'}
              </button>
            </div>

            {!localPrint.impTermica && (
              <p className="text-xs text-center text-ink-2">
                Sin impresora configurada. Ve a Configuración → Impresora para activarla.
              </p>
            )}
          </div>
        </div>
      </div>
    )
  }

  // ── Formulario de cierre ────────────────────────────────────────
  return (
    <div className="min-h-screen bg-surface-soft flex flex-col">
      <header className="bg-white border-b border-border px-6 py-4 flex items-center gap-3">
        <button onClick={() => navigate('/pos')}
          className="p-1.5 text-ink-2 hover:text-ink hover:bg-surface-soft rounded-lg transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <p className="text-sm font-semibold text-ink">Cerrar caja</p>
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
              <ResumenFila label="Fondo inicial"      valor={COP(fondoInicial)} />
              <ResumenFila label="Ventas en efectivo" valor={`+ ${COP(ventasEfectivo)}`} />
              <ResumenFila label="Efectivo esperado"  valor={COP(efectivoEsperado)} highlight />
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
                  type="number" min="0" step="1000"
                  value={efectivoContado}
                  onChange={(e) => setEfectivoContado(e.target.value)}
                  placeholder="0"
                  className="w-full px-3 py-2.5 border border-border rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-colors"
                  autoFocus
                />
                {efectivoContado !== '' && !isNaN(contado) && (
                  <p className="text-xs text-ink-2">{COP(contado)}</p>
                )}
              </div>

              {/* Diferencia en tiempo real */}
              {efectivoContado !== '' && !isNaN(contado) && (
                <div className={`flex items-center justify-between px-4 py-3 rounded-xl text-sm font-semibold border ${
                  diferencia > 0 ? 'bg-green-50 text-success border-green-200'
                  : diferencia < 0 ? 'bg-red-50 text-danger border-red-200'
                  : 'bg-surface-soft text-ink-2 border-border'
                }`}>
                  <span>{diferencia > 0 ? 'Sobrante' : diferencia < 0 ? 'Faltante' : 'Cuadrado exacto'}</span>
                  <span className="flex items-center gap-1">
                    {diferencia > 0 ? <TrendingUp className="w-4 h-4" /> : diferencia < 0 ? <TrendingDown className="w-4 h-4" /> : <Minus className="w-4 h-4" />}
                    {diferencia > 0 ? '+' : ''}{COP(diferencia)}
                  </span>
                </div>
              )}

              {/* Modo turnos: cajero entrante */}
              {modTurnos && (
                <div className="pt-2 border-t border-border space-y-3">
                  <label className="flex items-center gap-3 cursor-pointer select-none">
                    <div
                      onClick={() => setCajeroEntrante(v => !v)}
                      className={`relative w-10 h-5 rounded-full transition-colors ${cajeroEntrante ? 'bg-accent' : 'bg-border'}`}
                    >
                      <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${cajeroEntrante ? 'translate-x-5' : ''}`} />
                    </div>
                    <div>
                      <span className="text-sm font-medium text-ink flex items-center gap-1.5">
                        <Users className="w-3.5 h-3.5" /> ¿Hay cajero entrante?
                      </span>
                      <span className="text-xs text-ink-2">Activa si otro cajero continúa el turno</span>
                    </div>
                  </label>

                  {cajeroEntrante && (
                    <div className="space-y-1.5 pl-4 border-l-2 border-accent/30">
                      <label className="block text-sm font-medium text-ink">Fondo que dejas en caja (COP)</label>
                      <input
                        type="number" min="0" step="1000"
                        value={fondoSiguiente}
                        onChange={(e) => setFondoSiguiente(e.target.value)}
                        placeholder={contado > 0 ? String(contado) : '0'}
                        className="w-full px-3 py-2.5 border border-border rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-colors"
                      />
                      {fondoSiguiente && !isNaN(Number(fondoSiguiente)) && (
                        <p className="text-xs text-ink-2">{COP(Number(fondoSiguiente))}</p>
                      )}
                    </div>
                  )}
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
                {cerrarMutation.isPending ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Cerrando...</>
                ) : cajeroEntrante ? 'Registrar cambio de turno' : 'Cerrar caja'}
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
      <span className="text-ink">{valor}</span>
    </div>
  )
}
