import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { ShoppingCart, LogOut, Clock, DollarSign, CheckCircle, Info } from 'lucide-react'
import { cajasService } from '../services/cajas'
import { useAuth } from '../context/AuthContext'
import { useTenant } from '../hooks/useTenant'
import { Button } from '../components/Common/Button'
import { Input } from '../components/Common/Input'
import { COP } from '../lib/format'

export default function AbrirCaja() {
  const navigate = useNavigate()
  const { user, tenant: authTenant, logout } = useAuth()
  const { tenant } = useTenant()

  const [cajaId, setCajaId] = useState('')
  const [fondo, setFondo] = useState('')
  const [errorFondo, setErrorFondo] = useState('')
  const [errorCaja, setErrorCaja] = useState('')

  const ahora = new Date()
  const horaFormateada = ahora.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })
  const fechaFormateada = ahora.toLocaleDateString('es-CO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })

  const { data: sesionActiva, isLoading: loadingSesion } = useQuery({
    queryKey: ['sesion-activa'],
    queryFn: cajasService.getSesionActiva,
    retry: false,
    throwOnError: false,
  })

  const { data: cajas = [], isLoading: loadingCajas } = useQuery({
    queryKey: ['cajas'],
    queryFn: cajasService.getCajas,
    select: (data) => data.filter(c => c.activa),
  })

  const modTurnos = tenant?.modo_turnos === true

  // Última sesión cerrada con fondo_siguiente para pre-llenar
  const { data: ultimaSesion } = useQuery({
    queryKey: ['ultima-sesion', cajaId],
    queryFn: () => cajasService.getUltimaSesion(cajaId || undefined),
    enabled: modTurnos,
  })

  // Pre-llenar fondo cuando llega la última sesión (solo si el campo está vacío)
  useEffect(() => {
    if (modTurnos && ultimaSesion?.fondo_siguiente > 0 && fondo === '') {
      setFondo(String(ultimaSesion.fondo_siguiente))
    }
  }, [ultimaSesion, modTurnos])

  const abrirMutation = useMutation({
    mutationFn: (datos) => cajasService.abrirSesion(datos),
    onSuccess: () => navigate('/pos'),
  })

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  const handleAbrirCaja = (e) => {
    e.preventDefault()
    let valido = true

    if (!fondo.trim() || isNaN(Number(fondo)) || Number(fondo) < 0) {
      setErrorFondo('Ingresa el fondo inicial (puede ser 0)')
      valido = false
    } else {
      setErrorFondo('')
    }

    const usaMultiCaja = authTenant?.modo_caja === 'multicaja' || cajas.length > 1
    if (usaMultiCaja && !cajaId) {
      setErrorCaja('Selecciona una caja')
      valido = false
    } else {
      setErrorCaja('')
    }

    if (!valido) return

    const datos = {
      fondo_inicial: Number(fondo),
      ...(cajaId ? { caja_id: cajaId } : {}),
    }
    abrirMutation.mutate(datos)
  }

  if (loadingSesion) {
    return (
      <div className="min-h-screen bg-surface-soft flex items-center justify-center">
        <div className="text-sm text-ink-2">Verificando turno...</div>
      </div>
    )
  }

  const usaMultiCaja = authTenant?.modo_caja === 'multicaja' || cajas.length > 1

  return (
    <div className="min-h-screen bg-surface-soft flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-border px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="w-9 h-9 rounded-full bg-accent flex items-center justify-center font-brand font-bold text-lg text-white">C</span>
          <div>
            <span className="font-brand font-semibold text-base text-ink flex items-center">
              Carolina<span className="bg-accent text-white font-bold text-xs px-2 py-0.5 rounded-md ml-1.5">POS</span>
            </span>
            {tenant && <p className="text-xs text-ink-2">{tenant.nombre}</p>}
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-1.5 text-xs text-ink-2 hover:text-ink transition-colors"
        >
          <LogOut className="w-3.5 h-3.5" />
          Cerrar sesión
        </button>
      </header>

      {/* Contenido */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md space-y-6">

          {/* Bienvenida */}
          <div className="text-center space-y-1">
            <div className="w-14 h-14 bg-accent rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-white text-xl font-bold">
                {user?.nombre?.charAt(0)?.toUpperCase() || 'U'}
              </span>
            </div>
            <h1 className="text-2xl font-semibold text-ink">
              Hola, {user?.nombre?.split(' ')[0] || 'usuario'}
            </h1>
            <div className="flex items-center justify-center gap-2 text-ink-2 text-sm">
              <Clock className="w-4 h-4" />
              <span>{horaFormateada} — {fechaFormateada}</span>
            </div>
          </div>

          {/* Caso: ya tiene sesión activa */}
          {sesionActiva && (sesionActiva.id || sesionActiva._id) ? (
            <div className="bg-white rounded-xl border border-border shadow-sm p-6 space-y-4">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-success flex-shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-ink">Tienes un turno abierto</p>
                  <p className="text-xs text-ink-2 mt-0.5">
                    Caja: {sesionActiva.caja?.nombre || 'Caja principal'} · Fondo: {COP(sesionActiva.fondo_inicial || 0)}
                  </p>
                </div>
              </div>
              <button
                onClick={() => navigate('/pos')}
                className="w-full flex items-center justify-center gap-2 bg-accent hover:bg-accent/90 text-white font-semibold px-4 py-3 rounded-lg text-sm transition-colors"
              >
                <ShoppingCart className="w-4 h-4" />
                Ir al Punto de Venta
              </button>
            </div>
          ) : (
            /* Caso: abrir nuevo turno */
            <div className="bg-white rounded-xl border border-border shadow-sm p-6">
              <div className="mb-5">
                <h2 className="text-base font-semibold text-ink">Abrir turno de caja</h2>
                <p className="text-xs text-ink-2 mt-1">
                  Ingresa el efectivo con el que inicias tu turno
                </p>
              </div>

              <form onSubmit={handleAbrirCaja} className="space-y-4">
                {/* Selector de caja */}
                {usaMultiCaja && cajas.length > 0 && (
                  <div className="space-y-1.5">
                    <label className="block text-sm font-medium text-ink">Caja</label>
                    <select
                      value={cajaId}
                      onChange={(e) => { setCajaId(e.target.value); setErrorCaja('') }}
                      className={`w-full px-3 py-2.5 border text-sm rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-colors ${
                        errorCaja ? 'border-red-400 bg-red-50' : 'border-border hover:border-border-strong'
                      }`}
                    >
                      <option value="">Seleccionar caja...</option>
                      {cajas.map(c => (
                        <option key={c.id || c._id} value={c.id || c._id}>{c.nombre}</option>
                      ))}
                    </select>
                    {errorCaja && <p className="text-xs text-danger">{errorCaja}</p>}
                  </div>
                )}

                {/* Fondo inicial */}
                <div className="space-y-1.5">
                  <label className="block text-sm font-medium text-ink">Fondo inicial en efectivo</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                      <DollarSign className="w-4 h-4 text-ink-2" />
                    </div>
                    <input
                      type="number"
                      min="0"
                      step="1000"
                      value={fondo}
                      onChange={(e) => { setFondo(e.target.value); setErrorFondo('') }}
                      placeholder="0"
                      className={`w-full pl-9 pr-3 py-2.5 border text-sm rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-colors ${
                        errorFondo ? 'border-red-400 bg-red-50' : 'border-border hover:border-border-strong'
                      }`}
                    />
                  </div>
                  {errorFondo && <p className="text-xs text-danger">{errorFondo}</p>}
                  {fondo && !isNaN(Number(fondo)) && (
                    <p className="text-xs text-ink-2">{COP(Number(fondo))}</p>
                  )}
                  {modTurnos && ultimaSesion?.fondo_siguiente > 0 && (
                    <p className="text-xs text-accent flex items-center gap-1 mt-1">
                      <Info className="w-3 h-3" />
                      El turno anterior dejó: {COP(ultimaSesion.fondo_siguiente)}
                    </p>
                  )}
                </div>

                {abrirMutation.isError && (
                  <p className="text-xs text-danger">
                    {abrirMutation.error?.response?.data?.message || 'Error al abrir la caja'}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={abrirMutation.isPending}
                  className="w-full flex items-center justify-center gap-2 bg-accent hover:bg-accent/90 text-white font-semibold px-4 py-3 rounded-lg text-sm transition-colors disabled:opacity-50 focus:ring-2 focus:ring-accent/50 focus:outline-none"
                >
                  <ShoppingCart className="w-4 h-4" />
                  {abrirMutation.isPending ? 'Abriendo...' : 'Abrir mi caja'}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
