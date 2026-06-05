import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import {
  Search, User, AlertCircle, Loader2, CheckCircle2, X, Trash2,
  ArrowLeft, ShoppingCart, Barcode, Plus, Minus,
} from 'lucide-react'
import { usePOSStore } from '../store/posStore'
import { useUIStore } from '../store/uiStore'
import { posService } from '../services/pos'
import { clientesService } from '../services/clientes'
import { productosService } from '../services/productos'
import { FacturaA4 } from '../components/POS/FacturaA4'
import { MetodoPago } from '../components/POS/MetodoPago'
import { Modal } from '../components/Common/Modal'
import { useAuth } from '../context/AuthContext'
import { useSounds } from '../hooks/useSounds'
import { useUSBPrinter } from "../hooks/useUSBPrinter"
import { buildTicket } from '../lib/escpos'
import { COP } from '../lib/format'

export default function POS() {
  const qc = useQueryClient()
  const navigate = useNavigate()
  const { tenant, user } = useAuth()
  const { success: soundSuccess, error: soundError, scan } = useSounds()
  const qzTray = useUSBPrinter()
  const { setSidebar } = useUIStore()
  const [vistaTicket, setVistaTicket] = useState('ticket')

  const qzTrayRef = useRef(qzTray)
  useEffect(() => { qzTrayRef.current = qzTray }, [qzTray])

  useEffect(() => {
    setSidebar(false)
    return () => setSidebar(true)
  }, [])

  const scannerMs  = parseInt(localStorage.getItem('carolina_scanner_ms')  || '80')
  const scannerMin = parseInt(localStorage.getItem('carolina_scanner_min') || '3')

  const [showClienteModal, setShowClienteModal] = useState(false)
  const [showCobroModal,   setShowCobroModal]   = useState(false)
  const [showTicketModal,  setShowTicketModal]  = useState(false)
  const [ventaResult,      setVentaResult]      = useState(null)
  const [clienteSearch,    setClienteSearch]    = useState('')
  const [errorVenta,       setErrorVenta]       = useState('')
  const [efectivoRecibido, setEfectivoRecibido] = useState('')
  const [scanMsg,          setScanMsg]          = useState(null)
  const [searchText,       setSearchText]       = useState('')
  const [searchDebounced,  setSearchDebounced]  = useState('')
  const [resultIndex,      setResultIndex]      = useState(-1)
  const [mobileCartOpen,   setMobileCartOpen]   = useState(false)

  const searchRef   = useRef(null)
  const debounceRef = useRef(null)
  const scanBuffer  = useRef('')
  const bufferStart = useRef(null)
  const scanTimer   = useRef(null)
  const lastAdded   = useRef(null)

  useEffect(() => {
    clearTimeout(debounceRef.current)
    if (searchText.length === 0) { setSearchDebounced(''); setResultIndex(-1); return }
    debounceRef.current = setTimeout(() => {
      setSearchDebounced(searchText)
      setResultIndex(-1)
    }, 250)
    return () => clearTimeout(debounceRef.current)
  }, [searchText])

  const {
    carrito, clienteSeleccionado, metodoPago,
    agregarItem, actualizarCantidad, removerItem, limpiarCarrito,
    setCliente, getSubtotal, getIVA, getTotal,
  } = usePOSStore()

  const subtotal = getSubtotal()
  const iva      = getIVA()
  const total    = getTotal()

  const efectivoNum = parseFloat(efectivoRecibido.replace(/[^0-9.]/g, '')) || 0
  const vuelto = metodoPago === 'efectivo' && efectivoNum > total ? efectivoNum - total : 0
  const efectivoInsuficiente = metodoPago === 'efectivo' && efectivoRecibido && efectivoNum < total

  const mostrarMsg = useCallback((texto, tipo = 'ok') => {
    setScanMsg({ texto, tipo })
    setTimeout(() => setScanMsg(null), 2000)
  }, [])

  const { data: searchResults, isFetching: buscando } = useQuery({
    queryKey: ['pos-search', searchDebounced],
    queryFn: () => productosService.getAll({ search: searchDebounced, activo: true, limit: 12 }),
    enabled: searchDebounced.length >= 1,
    staleTime: 15000,
  })

  const productos = searchResults?.productos || []

  const agregarDesdeResultado = useCallback((p) => {
    if (!p) return
    if (p.stock_actual <= 0) { soundError(); mostrarMsg(`Sin stock: ${p.nombre}`, 'error'); return }
    agregarItem(p)
    lastAdded.current = p.id
    scan()
    setSearchText('')
    setSearchDebounced('')
    setResultIndex(-1)
    searchRef.current?.focus()
  }, [agregarItem, scan, soundError, mostrarMsg])

  const procesarEscaneo = useCallback(async (code) => {
    try {
      const res = await productosService.getAll({ search: code, activo: true, limit: 5 })
      const exacto = res.productos?.find(p => p.codigo === code)
      const producto = exacto || res.productos?.[0]
      if (!producto) { soundError(); mostrarMsg(`"${code}" no encontrado`, 'error'); return }
      if (producto.stock_actual <= 0) { soundError(); mostrarMsg(`Sin stock: ${producto.nombre}`, 'error'); return }
      agregarItem(producto)
      lastAdded.current = producto.id
      scan()
      mostrarMsg(`+ ${producto.nombre}`)
      setSearchText('')
    } catch { soundError() }
  }, [agregarItem, scan, soundError, mostrarMsg])

  useEffect(() => {
    const onKey = async (e) => {
      if (showCobroModal || showClienteModal || showTicketModal) return

      const enInput    = (e.target.tagName.toLowerCase() === 'input' || e.target.tagName.toLowerCase() === 'textarea')
      const enBuscador = e.target === searchRef.current

      if ((e.key === '+' || e.key === 'Add') && !enInput) {
        e.preventDefault()
        if (lastAdded.current) {
          const item = usePOSStore.getState().carrito.find(i => i.producto_id === lastAdded.current)
          if (item && item.cantidad < item.stock_actual) { actualizarCantidad(item.producto_id, item.cantidad + 1); scan() }
        }
        return
      }

      if ((e.key === '-' || e.key === 'Subtract') && !enInput) {
        e.preventDefault()
        if (lastAdded.current) {
          const item = usePOSStore.getState().carrito.find(i => i.producto_id === lastAdded.current)
          if (item) actualizarCantidad(item.producto_id, item.cantidad - 1)
        }
        return
      }

      if (e.key === 'F2') { e.preventDefault(); setShowClienteModal(true); return }
      if (e.key === 'F3') { e.preventDefault(); if (usePOSStore.getState().carrito.length > 0) setShowCobroModal(true); return }

      if (e.key === 'ArrowDown' && enBuscador) {
        e.preventDefault()
        setResultIndex(i => Math.min(i + 1, (searchResults?.productos?.length || 1) - 1))
        return
      }
      if (e.key === 'ArrowUp' && enBuscador) {
        e.preventDefault()
        setResultIndex(i => Math.max(i - 1, 0))
        return
      }

      if (e.key === 'Escape' && enBuscador) {
        setSearchText(''); setSearchDebounced(''); setResultIndex(-1)
        return
      }

      if (e.key === 'Enter') {
        const code    = scanBuffer.current.trim()
        const start   = bufferStart.current
        const elapsed = start ? Date.now() - start : Infinity
        scanBuffer.current  = ''
        bufferStart.current = null
        clearTimeout(scanTimer.current)

        if (code.length >= scannerMin && elapsed < 400) {
          e.preventDefault()
          await procesarEscaneo(code)
          return
        }

        if (enBuscador && resultIndex >= 0 && searchResults?.productos?.[resultIndex]) {
          e.preventDefault()
          agregarDesdeResultado(searchResults.productos[resultIndex])
          return
        }

        if (enBuscador && searchResults?.productos?.length === 1) {
          e.preventDefault()
          agregarDesdeResultado(searchResults.productos[0])
          return
        }

        if (enBuscador && searchResults?.productos?.length > 1 && resultIndex === -1) {
          e.preventDefault()
          agregarDesdeResultado(searchResults.productos[0])
          return
        }

        if (!enInput && usePOSStore.getState().carrito.length > 0) {
          e.preventDefault()
          setShowCobroModal(true)
        }
        return
      }

      if (e.key.length === 1) {
        const now = Date.now()
        if (scanBuffer.current.length === 0) {
          bufferStart.current = now
          scanBuffer.current  = e.key
        } else {
          scanBuffer.current += e.key
        }
        const sinceStart = now - (bufferStart.current || now)
        if (sinceStart < scannerMs && scanBuffer.current.length > 1) {
          if (enBuscador) e.preventDefault()
        }
        clearTimeout(scanTimer.current)
        scanTimer.current = setTimeout(() => {
          scanBuffer.current  = ''
          bufferStart.current = null
        }, 300)
      }
    }

    window.addEventListener('keydown', onKey, true)
    return () => { window.removeEventListener('keydown', onKey, true); clearTimeout(scanTimer.current) }
  }, [showCobroModal, showClienteModal, showTicketModal, searchResults, procesarEscaneo, agregarDesdeResultado, actualizarCantidad, scan])

  const { data: clientesData } = useQuery({
    queryKey: ['clientes-pos', clienteSearch],
    queryFn: () => clientesService.getAll({ search: clienteSearch, limit: 10 }),
    enabled: showClienteModal,
  })

  const ventaMutation = useMutation({
    mutationFn: posService.procesarVenta,
    onSuccess: async (data) => {
      soundSuccess()
      const snap = [...carrito]
      const ef   = metodoPago === 'efectivo' ? efectivoNum : 0
      const modoDemo = data.estado === 'demo'

      const ventaFinal = {
        ...data,
        items: snap.map(i => ({
          descripcion: i.nombre,
          cantidad: i.cantidad,
          precio_unitario: i.precio_unitario,
          subtotal: i.precio_unitario * i.cantidad * (1 - i.descuento / 100),
        })),
        subtotal,
        impuesto_total: iva,
        metodo_pago: metodoPago,
        efectivo_recibido: ef,
      }

      const qt = qzTrayRef.current
      if (qt.conectado && qt.impTermica) {
        try {
          const anchoPapel = localStorage.getItem('carolina_printer_ancho') || '80'
          const W = anchoPapel === '58' ? 32 : 48
          const cmds = buildTicket({
            empresa: tenant || {}, venta: ventaFinal, cliente: clienteSeleccionado,
            cajero: user?.nombre || '', abrirGaveta: true, modoDemo, W,
            densidad: qt.densidad, avancePapel: qt.avancePapel, modoCortePapel: qt.modoCortePapel,
          })
          await qt.imprimirTicket(cmds)
        } catch (e) {
          mostrarMsg(`Error al imprimir: ${e.message}`, 'error')
        }
      }

      setVentaResult(ventaFinal)
      limpiarCarrito()
      setShowCobroModal(false)
      setShowTicketModal(true)
      setEfectivoRecibido('')
      qc.invalidateQueries({ queryKey: ['pos-dashboard'] })
    },
    onError: (err) => { soundError(); setErrorVenta(err.response?.data?.error || 'Error al procesar la venta') },
  })

  const handleCobrar = () => {
    setErrorVenta('')
    ventaMutation.mutate({
      cliente_id: clienteSeleccionado?.id || undefined,
      items: carrito.map(i => ({ producto_id: i.producto_id, cantidad: i.cantidad, precio_unitario: i.precio_unitario, descuento: i.descuento })),
      metodo_pago: metodoPago,
    })
  }

  return (
    <div className="h-screen bg-surface-soft flex flex-col overflow-hidden">

      {/* â”€â”€ BARRA SUPERIOR â”€â”€ */}
      <header className="bg-white border-b border-border h-12 px-5 flex items-center gap-4 flex-shrink-0">
        <button
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-1.5 text-xs font-medium text-ink-2 hover:text-ink transition-colors"
        >
          <ArrowLeft size={15} />
          Salir
        </button>

        <div className="hidden sm:block w-px h-5 bg-border" />

        <div className="hidden sm:flex items-center gap-2">
          <span className="w-7 h-7 rounded-full bg-accent flex items-center justify-center font-brand font-bold text-sm text-white">C</span>
          <span className="font-brand font-semibold text-sm text-ink flex items-center">
            Carolina<span className="bg-accent text-white font-bold text-xs px-1.5 py-0.5 rounded ml-1">POS</span>
          </span>
        </div>

        {/* Feedback scanner */}
        {scanMsg && (
          <span className={`ml-4 text-xs font-medium px-3 py-1 rounded-lg ${
            scanMsg.tipo === 'ok' ? 'bg-green-50 text-success border border-green-200' : 'bg-red-50 text-danger border border-red-200'
          }`}>
            {scanMsg.tipo === 'ok' ? 'âœ“' : 'âœ•'} {scanMsg.texto}
          </span>
        )}

        {carrito.length > 0 && (
          <button
            onClick={limpiarCarrito}
            className="ml-auto flex items-center gap-1.5 text-xs text-ink-2 hover:text-danger transition-colors"
          >
            <Trash2 size={13} />
            Limpiar carrito
          </button>
        )}
      </header>

      {/* â”€â”€ CONTENIDO PRINCIPAL â”€â”€ */}
      <div className="flex flex-1 overflow-hidden">

        {/* â•â• PANEL IZQUIERDO: bÃºsqueda + resultados â•â• */}
        <div className="flex-1 flex flex-col overflow-hidden">

          {/* Buscador */}
          <div className="bg-white border-b border-border px-4 sm:px-6 py-3 sm:py-4 space-y-2 sm:space-y-3">
            <div className="space-y-1.5">
              <label className="hidden sm:block text-xs font-semibold text-ink-2 uppercase tracking-wider">
                Buscar producto o escanear cÃ³digo
              </label>
              <div className="relative">
                <Search size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-2" />
                <input
                  ref={searchRef}
                  type="text"
                  value={searchText}
                  onChange={e => setSearchText(e.target.value)}
                  autoFocus
                  autoComplete="off"
                  placeholder="Nombre, cÃ³digo de barras o referencia..."
                  className="w-full pl-9 pr-9 py-2.5 border-2 border-border rounded-lg text-sm focus:outline-none focus:ring-0 focus:border-accent hover:border-border-strong transition-colors"
                />
                {buscando ? (
                  <Loader2 size={15} className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-2 animate-spin" />
                ) : searchText.length > 0 ? (
                  <button
                    type="button"
                    onClick={() => { setSearchText(''); searchRef.current?.focus() }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-2 hover:text-ink transition-colors"
                  >
                    <X size={15} />
                  </button>
                ) : null}
              </div>
            </div>

            {/* Atajos â€” solo desktop (sin sentido en mÃ³vil tÃ¡ctil) */}
            <div className="hidden sm:flex items-center gap-4 text-xs text-ink-2">
              <span><kbd className="bg-surface-soft border border-border rounded px-1.5 py-0.5 font-mono text-xs">F2</kbd> Cliente</span>
              <span><kbd className="bg-surface-soft border border-border rounded px-1.5 py-0.5 font-mono text-xs">F3</kbd> Cobrar</span>
              <span><kbd className="bg-surface-soft border border-border rounded px-1.5 py-0.5 font-mono text-xs">Esc</kbd> Limpiar</span>
              <span><kbd className="bg-surface-soft border border-border rounded px-1.5 py-0.5 font-mono text-xs">â†‘â†“</kbd> Navegar</span>
              <span><kbd className="bg-surface-soft border border-border rounded px-1.5 py-0.5 font-mono text-xs">+/-</kbd> Cantidad</span>
            </div>
          </div>

          {/* Resultados */}
          <div className="flex-1 overflow-y-auto p-3 sm:p-5">
            {searchText.trim().length > 0 ? (
              <div>
                {productos.length > 0 && (
                  <p className="text-xs font-medium text-ink-2 mb-3">
                    {productos.length} resultado{productos.length !== 1 ? 's' : ''}
                    {productos.length > 1 && <span className="ml-2 opacity-60">â†‘â†“ para navegar Â· Enter para agregar</span>}
                  </p>
                )}

                {productos.length === 0 && !buscando ? (
                  <div className="flex flex-col items-center justify-center py-16 text-ink-2">
                    <Barcode size={40} className="mb-3 opacity-20" />
                    <p className="text-sm">Sin resultados para <strong>"{searchText}"</strong></p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2 sm:gap-3">
                    {productos.map((p, idx) => {
                      const sinStock = p.stock_actual <= 0
                      const activo   = idx === resultIndex
                      return (
                        <button
                          key={p.id}
                          onClick={() => agregarDesdeResultado(p)}
                          disabled={sinStock}
                          className={`text-left rounded-xl border p-3 sm:p-4 transition-all w-full ${
                            activo
                              ? 'border-accent bg-accent-soft shadow-sm'
                              : sinStock
                              ? 'border-border bg-white opacity-50 cursor-not-allowed'
                              : 'border-border bg-white hover:border-accent/40 hover:shadow-sm'
                          }`}
                        >
                          {/* Precio arriba-derecha + info abajo: layout compacto en mÃ³vil */}
                          <div className="flex items-start justify-between gap-2 min-w-0">
                            <div className="flex-1 min-w-0 overflow-hidden">
                              {p.codigo && (
                                <p className="font-mono text-xs text-accent font-semibold mb-0.5 truncate">{p.codigo}</p>
                              )}
                              <h4 className="text-sm font-semibold text-ink leading-tight line-clamp-2">{p.nombre}</h4>
                            </div>
                            <p className="text-sm font-bold text-ink flex-shrink-0 ml-2">{COP(p.precio_venta)}</p>
                          </div>
                          <div className="flex items-center gap-2 mt-2 text-xs text-ink-2 flex-wrap">
                            {p.nombre_categoria && <span className="truncate max-w-[120px]">{p.nombre_categoria}</span>}
                            {p.nombre_categoria && <span className="w-1 h-1 rounded-full bg-border flex-shrink-0" />}
                            {sinStock
                              ? <span className="text-danger font-medium">Sin stock</span>
                              : <span className="flex-shrink-0">Stock: {p.stock_actual}</span>
                            }
                            {p.impuesto_iva > 0 && !sinStock && (
                              <span className="flex-shrink-0 text-ink-2/60">IVA inc.</span>
                            )}
                          </div>
                        </button>
                      )
                    })}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-ink-2 py-16">
                <Barcode size={48} className="mb-4 opacity-15" />
                <p className="text-sm font-medium">Busca un producto o escanea un cÃ³digo</p>
                <p className="text-xs mt-1 opacity-60">El scanner funciona automÃ¡ticamente</p>
              </div>
            )}
          </div>
        </div>

        {/* Overlay mÃ³vil */}
        {mobileCartOpen && (
          <div className="fixed inset-0 bg-black/40 z-40 md:hidden" onClick={() => setMobileCartOpen(false)} />
        )}

        {/* â•â• PANEL DERECHO: carrito â•â• */}
        <div className={`
          fixed inset-x-0 bottom-0 z-50 bg-white rounded-t-2xl shadow-2xl max-h-[88vh] overflow-hidden
          flex flex-col transform transition-transform
          ${mobileCartOpen ? 'translate-y-0' : 'translate-y-full'}
          md:relative md:inset-auto md:translate-y-0 md:max-h-none
          md:shadow-none md:rounded-none md:w-80 md:flex-shrink-0 md:border-l md:border-border
        `}>

          {/* Handle mÃ³vil */}
          <div className="md:hidden flex justify-center pt-3 pb-1 flex-shrink-0">
            <div className="w-10 h-1 bg-border rounded-full" />
          </div>

          {/* Header carrito */}
          <div className="px-4 py-3 border-b border-border flex items-center justify-between flex-shrink-0">
            <div className="flex items-center gap-2">
              <ShoppingCart size={16} className="text-ink-2" />
              <h2 className="text-sm font-semibold text-ink">Orden</h2>
            </div>
            <div className="flex items-center gap-3">
              {carrito.length > 0 && (
                <span className="bg-accent text-white text-xs font-bold px-2 py-0.5 rounded-full">
                  {carrito.length}
                </span>
              )}
              <button className="md:hidden text-ink-2 hover:text-ink" onClick={() => setMobileCartOpen(false)}>
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Cliente */}
          <div className="px-4 py-2.5 border-b border-border flex-shrink-0">
            <button
              onClick={() => setShowClienteModal(true)}
              className="w-full flex items-center gap-2 text-xs text-ink-2 hover:text-ink transition-colors group"
            >
              <User size={13} className="flex-shrink-0" />
              {clienteSeleccionado
                ? <span className="font-medium text-ink truncate">{clienteSeleccionado.nombre}</span>
                : <span className="truncate">Consumidor final <span className="opacity-50">F2</span></span>
              }
              {clienteSeleccionado && (
                <span
                  onClick={e => { e.stopPropagation(); setCliente(null) }}
                  className="ml-auto text-ink-2 hover:text-ink"
                >
                  <X size={12} />
                </span>
              )}
            </button>
          </div>

          {/* Items del carrito */}
          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2 min-h-0">
            {carrito.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-ink-2 py-10">
                <ShoppingCart size={28} className="mb-2 opacity-20" />
                <p className="text-xs">El carrito estÃ¡ vacÃ­o</p>
              </div>
            ) : (
              carrito.map(item => {
                const itemTotal = item.precio_unitario * item.cantidad * (1 - item.descuento / 100)
                return (
                  <div key={item.producto_id} className="bg-surface-soft rounded-lg p-3 border border-border">
                    <div className="flex items-start gap-2">
                      <div className="flex-1 min-w-0">
                        {item.codigo && (
                          <p className="font-mono text-xs text-accent font-semibold">{item.codigo}</p>
                        )}
                        <p className="text-xs font-semibold text-ink leading-tight">{item.nombre}</p>
                        <p className="text-xs text-ink-2 mt-0.5">{COP(item.precio_unitario)} c/u</p>
                      </div>
                      <button
                        onClick={() => removerItem(item.producto_id)}
                        className="text-ink-2 hover:text-danger transition-colors p-0.5 flex-shrink-0"
                      >
                        <X size={13} />
                      </button>
                    </div>

                    <div className="flex items-center justify-between mt-2.5">
                      <div className="flex items-center border border-border rounded-lg bg-white overflow-hidden">
                        <button
                          onClick={() => actualizarCantidad(item.producto_id, item.cantidad - 1)}
                          className="px-2 py-1 text-ink-2 hover:bg-surface-soft hover:text-ink transition-colors"
                        >
                          <Minus size={11} />
                        </button>
                        <span className="px-3 py-1 text-xs font-bold text-ink border-x border-border min-w-[2rem] text-center">
                          {item.cantidad}
                        </span>
                        <button
                          onClick={() => actualizarCantidad(item.producto_id, item.cantidad + 1)}
                          disabled={item.cantidad >= item.stock_actual}
                          className="px-2 py-1 text-ink-2 hover:bg-surface-soft hover:text-ink transition-colors disabled:opacity-30"
                        >
                          <Plus size={11} />
                        </button>
                      </div>
                      <p className="text-sm font-bold text-ink">{COP(itemTotal)}</p>
                    </div>
                  </div>
                )
              })
            )}
          </div>

          {/* MÃ©todo de pago */}
          <div className="border-t border-border flex-shrink-0">
            <MetodoPago />
          </div>

          {/* Totales */}
          <div className="px-4 py-3 space-y-1.5 border-t border-border flex-shrink-0">
            <div className="flex justify-between text-xs text-ink-2">
              <span>Subtotal</span><span>{COP(subtotal)}</span>
            </div>
            <div className="flex justify-between text-xs text-ink-2">
              <span>IVA</span><span>{COP(iva)}</span>
            </div>
            <div className="flex justify-between text-sm font-bold text-ink border-t border-border pt-2">
              <span>Total</span><span>{COP(total)}</span>
            </div>
          </div>

          {/* BotÃ³n cobrar */}
          <div className="px-4 pb-4 flex-shrink-0">
            <button
              onClick={() => carrito.length > 0 && setShowCobroModal(true)}
              disabled={carrito.length === 0}
              className="w-full py-3 rounded-xl font-bold text-sm transition-colors disabled:opacity-30 text-white bg-accent hover:bg-accent/90 flex items-center justify-center gap-2"
            >
              {carrito.length === 0
                ? 'Carrito vacÃ­o'
                : <>Cobrar {COP(total)} <span className="text-xs bg-white/20 px-1.5 py-0.5 rounded font-mono">F3</span></>
              }
            </button>
          </div>
        </div>

        {/* BotÃ³n flotante carrito (solo mÃ³vil) */}
        <div className="fixed bottom-5 right-5 z-40 md:hidden">
          <button
            onClick={() => setMobileCartOpen(true)}
            className="bg-accent text-white rounded-full shadow-lg px-4 py-3 flex items-center gap-2 font-semibold text-sm"
          >
            <ShoppingCart size={17} />
            Carrito
            {carrito.length > 0 && (
              <span className="bg-white text-accent text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                {carrito.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* â”€â”€ Modal: cliente â”€â”€ */}
      <Modal isOpen={showClienteModal} onClose={() => setShowClienteModal(false)} title="Seleccionar cliente">
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-2" />
            <input
              autoFocus
              type="text"
              value={clienteSearch}
              onChange={e => setClienteSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-colors"
              placeholder="Buscar por nombre o documento..."
            />
          </div>
          <button
            onClick={() => { setCliente(null); setShowClienteModal(false) }}
            className="w-full py-2.5 border border-dashed border-border rounded-lg text-sm text-ink-2 hover:border-border-strong hover:text-ink transition-colors"
          >
            Consumidor final
          </button>
          <div className="max-h-60 overflow-y-auto divide-y divide-border">
            {clientesData?.clientes?.map(c => (
              <button
                key={c.id}
                onClick={() => { setCliente(c); setShowClienteModal(false) }}
                className="w-full text-left px-3 py-2.5 hover:bg-surface-soft transition-colors"
              >
                <p className="text-sm font-medium text-ink">{c.nombre}</p>
                <p className="text-xs text-ink-2">{c.tipo_documento}: {c.numero_documento}</p>
              </button>
            ))}
          </div>
        </div>
      </Modal>

      {/* â”€â”€ Modal: cobro â”€â”€ */}
      <Modal isOpen={showCobroModal} onClose={() => { setShowCobroModal(false); setErrorVenta('') }} title="Confirmar cobro" size="sm">
        <div
          className="space-y-5"
          onKeyDown={e => {
            if (e.key === 'Enter' && !ventaMutation.isPending && !efectivoInsuficiente) {
              e.preventDefault(); handleCobrar()
            }
          }}
        >
          <div className="text-center py-2">
            <p className="text-xs text-ink-2 uppercase tracking-wider mb-1">Total a cobrar</p>
            <p className="text-4xl font-bold text-ink tracking-tight">{COP(total)}</p>
            {clienteSeleccionado && (
              <p className="text-xs text-ink-2 mt-1">{clienteSeleccionado.nombre}</p>
            )}
          </div>

          <MetodoPago />

          {metodoPago === 'efectivo' && (
            <div className="space-y-2">
              <label className="text-xs font-semibold text-ink-2 uppercase tracking-wider">Efectivo recibido</label>
              <input
                autoFocus
                type="number"
                value={efectivoRecibido}
                onChange={e => setEfectivoRecibido(e.target.value)}
                className="w-full px-4 py-3 border border-border rounded-lg text-2xl font-bold text-center focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-colors"
                placeholder="0"
              />
              {efectivoNum >= total && efectivoNum > 0 && (
                <div className="flex justify-between text-sm font-semibold bg-surface-soft rounded-lg px-4 py-2.5">
                  <span className="text-ink-2">Vuelto</span>
                  <span className="text-ink">{COP(vuelto)}</span>
                </div>
              )}
              {efectivoInsuficiente && (
                <p className="text-xs text-danger text-center">Monto insuficiente</p>
              )}
            </div>
          )}

          {errorVenta && (
            <div className="flex items-start gap-2 bg-red-50 text-danger text-xs p-3 rounded-lg border border-red-200">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />{errorVenta}
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <button
              onClick={() => { setShowCobroModal(false); setErrorVenta('') }}
              className="flex-1 py-2.5 border border-border rounded-lg text-sm font-medium text-ink hover:bg-surface-soft transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleCobrar}
              disabled={ventaMutation.isPending || efectivoInsuficiente}
              className="flex-1 bg-accent text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-accent/90 disabled:opacity-40 flex items-center justify-center gap-2 transition-colors"
            >
              {ventaMutation.isPending
                ? <><Loader2 className="w-4 h-4 animate-spin" />Procesando...</>
                : 'Confirmar cobro'
              }
            </button>
          </div>
        </div>
      </Modal>

      {/* â”€â”€ Modal: resultado venta â”€â”€ */}
      <Modal isOpen={showTicketModal} onClose={() => setShowTicketModal(false)} title="" size="sm">
        {ventaResult && (
          <div className="text-center space-y-4 py-2">
            <CheckCircle2 className="w-12 h-12 text-success mx-auto" />
            <div>
              <p className="text-lg font-bold text-ink">{COP(ventaResult.total)}</p>
              <p className="text-sm text-ink-2 mt-1">
                {ventaResult.numero_factura ? `Factura ${ventaResult.numero_factura}` : 'Venta registrada'}
                {qzTray.conectado && qzTray.impTermica && ' Â· Ticket impreso'}
              </p>
              {ventaResult.efectivo_recibido > 0 && (
                <p className="text-base font-semibold text-ink mt-2">
                  Vuelto: {COP(Math.max(0, ventaResult.efectivo_recibido - ventaResult.total))}
                </p>
              )}
            </div>

            <div className="flex gap-2 pt-2">
              {qzTray.conectado && qzTray.impTermica && (
                <button
                  onClick={async () => {
                    try {
                      const W = localStorage.getItem('carolina_printer_ancho') === '58' ? 32 : 48
                      const cmds = buildTicket({
                        empresa: tenant || {}, venta: ventaResult, cliente: clienteSeleccionado,
                        cajero: user?.nombre || '', modoDemo: ventaResult?.estado === 'demo', W,
                        densidad: qzTray.densidad, avancePapel: qzTray.avancePapel,
                        modoCortePapel: qzTray.modoCortePapel, abrirGaveta: false,
                      })
                      await qzTray.imprimirTicket(cmds)
                    } catch {}
                  }}
                  className="flex-1 py-2 text-xs border border-border rounded-lg text-ink-2 hover:bg-surface-soft transition-colors"
                >
                  Reimprimir ticket
                </button>
              )}
              <button
                onClick={() => setVistaTicket(vistaTicket === 'a4' ? 'ticket' : 'a4')}
                className="flex-1 py-2 text-xs border border-border rounded-lg text-ink-2 hover:bg-surface-soft transition-colors"
              >
                {vistaTicket === 'a4' ? 'Ocultar factura' : 'Ver factura A4'}
              </button>
            </div>

            {vistaTicket === 'a4' && (
              <div className="border-t border-border pt-4">
                <FacturaA4 venta={ventaResult} tenant={tenant} cliente={clienteSeleccionado} />
              </div>
            )}

            <button
              onClick={() => { setShowTicketModal(false); setVistaTicket('ticket'); searchRef.current?.focus() }}
              className="w-full bg-accent text-white py-3 rounded-xl font-semibold text-sm hover:bg-accent/90 transition-colors"
            >
              Nueva venta
            </button>
          </div>
        )}
      </Modal>
    </div>
  )
}
