import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation } from '@tanstack/react-query'
import { ShoppingCart, LogOut, Clock, DollarSign, CheckCircle } from 'lucide-react'
import { cajasService } from '../services/cajas'
import { useAuth } from '../context/AuthContext'
import { Button } from '../components/Common/Button'
import { Input } from '../components/Common/Input'
import { COP } from '../lib/format'

export default function AbrirCaja() {
  const navigate = useNavigate()
  const { user, tenant, logout } = useAuth()

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
    // 404 = sin sesión activa, no es error real
    throwOnError: false,
  })

  const { data: cajas = [], isLoading: loadingCajas } = useQuery({
    queryKey: ['cajas'],
    queryFn: cajasService.getCajas,
    select: (data) => data.filter(c => c.activa),
  })

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

    if (!fondo && fondo !== '0') {
      setErrorFondo('Ingresa el fondo inicial (puede ser 0)')
      valido = false
    } else if (isNaN(Number(fondo)) || Number(fondo) < 0) {
      setErrorFondo('Monto inválido')
      valido = false
    } else {
      setErrorFondo('')
    }

    const usaMultiCaja = tenant?.modo_caja === 'multicaja' || cajas.length > 1
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
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-sm text-gray-400">Verificando turno...</div>
      </div>
    )
  }

  const usaMultiCaja = tenant?.modo_caja === 'multicaja' || cajas.length > 1

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
        <div>
          <p className="text-base font-bold text-gray-900 tracking-tight">Carolina</p>
          {tenant && <p className="text-xs text-gray-400">{tenant.nombre}</p>}
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-700 transition-colors"
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
            <div className="w-14 h-14 bg-gray-900 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-white text-xl font-bold">
                {user?.nombre?.charAt(0)?.toUpperCase() || 'U'}
              </span>
            </div>
            <h1 className="text-2xl font-semibold text-gray-900">
              Hola, {user?.nombre?.split(' ')[0] || 'usuario'}
            </h1>
            <div className="flex items-center justify-center gap-2 text-gray-400 text-sm">
              <Clock className="w-4 h-4" />
              <span>{horaFormateada} — {fechaFormateada}</span>
            </div>
          </div>

          {/* Caso: ya tiene sesión activa */}
          {sesionActiva && (sesionActiva.id || sesionActiva._id) ? (
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 space-y-4">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-gray-900">Tienes un turno abierto</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Caja: {sesionActiva.caja?.nombre || 'Caja principal'} · Fondo: {COP(sesionActiva.fondo_inicial || 0)}
                  </p>
                </div>
              </div>
              <Button className="w-full" size="lg" onClick={() => navigate('/pos')}>
                <ShoppingCart className="w-4 h-4" />
                Ir al Punto de Venta
              </Button>
            </div>
          ) : (
            /* Caso: abrir nuevo turno */
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
              <div className="mb-5">
                <h2 className="text-sm font-semibold text-gray-900">Abrir turno de caja</h2>
                <p className="text-xs text-gray-400 mt-1">
                  Ingresa el efectivo con el que inicias tu turno
                </p>
              </div>

              <form onSubmit={handleAbrirCaja} className="space-y-4">
                {/* Selector de caja (solo si multicaja) */}
                {usaMultiCaja && cajas.length > 0 && (
                  <div className="space-y-1">
                    <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wide">
                      Caja
                    </label>
                    <select
                      value={cajaId}
                      onChange={(e) => { setCajaId(e.target.value); setErrorCaja('') }}
                      className={`w-full px-3 py-2 border text-sm rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-gray-900 focus:border-gray-900 ${
                        errorCaja ? 'border-red-400 bg-red-50' : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <option value="">Seleccionar caja...</option>
                      {cajas.map(c => (
                        <option key={c.id || c._id} value={c.id || c._id}>{c.nombre}</option>
                      ))}
                    </select>
                    {errorCaja && <p className="text-xs text-red-500">{errorCaja}</p>}
                  </div>
                )}

                {/* Fondo inicial */}
                <div className="space-y-1">
                  <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wide">
                    Fondo inicial en efectivo
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                      <DollarSign className="w-4 h-4 text-gray-400" />
                    </div>
                    <input
                      type="number"
                      min="0"
                      step="1000"
                      value={fondo}
                      onChange={(e) => { setFondo(e.target.value); setErrorFondo('') }}
                      placeholder="0"
                      className={`w-full pl-9 pr-3 py-2 border text-sm rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-gray-900 focus:border-gray-900 ${
                        errorFondo ? 'border-red-400 bg-red-50' : 'border-gray-200 hover:border-gray-300'
                      }`}
                    />
                  </div>
                  {errorFondo && <p className="text-xs text-red-500">{errorFondo}</p>}
                  {fondo && !isNaN(Number(fondo)) && (
                    <p className="text-xs text-gray-400">{COP(Number(fondo))}</p>
                  )}
                </div>

                {abrirMutation.isError && (
                  <p className="text-xs text-red-500">
                    {abrirMutation.error?.response?.data?.message || 'Error al abrir la caja'}
                  </p>
                )}

                <Button
                  type="submit"
                  className="w-full"
                  size="lg"
                  loading={abrirMutation.isPending}
                >
                  <ShoppingCart className="w-4 h-4" />
                  Abrir mi caja
                </Button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
