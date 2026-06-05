import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import {
  Search, User, AlertCircle, Loader2, CheckCircle2, X, Trash2,
  ArrowLeft, ShoppingCart, Barcode, Plus, Minus, Unlock, LogOut, Calculator,
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
import { useLocalPrint } from '../hooks/useLocalPrint'
import { buildTicket } from '../lib/escpos'
import { COP } from '../lib/format'

export default function POS() {
  const qc = useQueryClient()
  const navigate = useNavigate()
  const { tenant, user } = useAuth()
  const { success: soundSuccess, error: soundError, scan } = useSounds()
  const qzTray = useLocalPrint()
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
  const [showOrderPanel,   setShowOrderPanel]   = useState(false)

  const searchRef    = useRef(null)
  const debounceRef  = useRef(null)
  const scanBuffer   = useRef('')
  const bufferStart  = useRef(null)
  const scanTimer    = useRef(null)
  const lastAdded    = useRef(null)

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
    queryFn: () => productosService.getAll({ search: searchDebounced, activo: true, limit: 10 }),
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

  // ─── RENDER ────────────────────────────────────────────────────────────────

  const showDropdown = searchText.length > 0

  return (
    <div className="h-screen bg-surface-soft flex flex-col overflow-hidden">

      {/* ── BARRA SUPERIOR ── */}
      <header className="bg-white border-b border-border h-14 flex-shrink-0 flex items-center px-4 gap-3">

        {/* Salir */}
        <button
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-1.5 text-xs font-medium text-ink-2 hover:text-ink transition-colors flex-shrink-0"
        >
          <ArrowLeft size={15} />
          <span className="hidden sm:inline">Salir</span>
        </button>

        <div className="hidden sm:block w-px h-5 bg-border flex-shrink-0" />

        {/* Brand */}
        <div className="hidden md:flex items-center gap-2 flex-shrink-0">
          <span className="w-7 h-7 rounded-full bg-accent flex items-center justify-center font-bold text-sm text-white">C</span>
          <span className="font-semibold text-sm text-ink flex items-center">
            Carolina<span className="bg-accent text-white font-bold text-xs px-1.5 py-0.5 rounded ml-1">POS</span>
          </span>
        </div>

        {/* Buscador con dropdown */}
        <div className="flex-1 relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-2 pointer-events-none" />
          <input
            ref={searchRef}
            id="pos-search"
            name="pos-search"
            type="text"
            value={searchText}
            onChange={e => setSearchText(e.target.value)}
            autoFocus
            autoComplete="off"
            placeholder="Buscar producto o escanear código de barras..."
            className="w-full pl-9 pr-8 py-2 border-2 border-border rounded-lg text-sm focus:outline-none focus:border-accent hover:border-border-strong transition-colors"
          />
          {buscando
            ? <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-2 animate-spin" />
            : searchText.length > 0
            ? <button type="button" onClick={() => { setSearchText(''); searchRef.current?.focus() }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-2 hover:text-ink">
                <X size={14} />
              </button>
            : null
          }

          {/* Dropdown resultados */}
          {showDropdown && (
            <div className="absolute top-full left-0 right-0 mt-1.5 bg-white border border-border rounded-xl shadow-2xl z-50 overflow-hidden">
              {productos.length === 0 && !buscando ? (
                <div className="flex items-center gap-3 px-4 py-4 text-ink-2">
                  <Barcode size={20} className="opacity-30 flex-shrink-0" />
                  <p className="text-sm">Sin resultados para <strong className="text-ink">"{searchText}"</strong></p>
                </div>
              ) : (
                <>
                  {productos.length > 1 && (
                    <div className="px-4 py-2 border-b border-border bg-surface-soft flex items-center justify-between">
                      <p className="text-xs text-ink-2 font-medium">{productos.length} resultados</p>
                      <p className="text-xs text-ink-2 hidden sm:block">↑↓ navegar &nbsp;·&nbsp; Enter agregar</p>
                    </div>
                  )}
                  <div className="max-h-72 overflow-y-auto divide-y divide-border">
                    {productos.map((p, idx) => {
                      const sinStock = p.stock_actual <= 0
                      const activo   = idx === resultIndex
                      return (
                        <button
                          key={p.id}
                          onMouseDown={() => agregarDesdeResultado(p)}
                          disabled={sinStock}
                          className={`w-full text-left px-4 py-3 flex items-center gap-3 transition-colors ${
                            activo
                              ? 'bg-accent-soft'
                              : sinStock
                              ? 'opacity-40 cursor-not-allowed'
                              : 'hover:bg-surface-soft'
                          }`}
                        >
                          <div className="flex-1 min-w-0">
                            {p.codigo && <p className="font-mono text-xs text-accent font-semibold mb-0.5">{p.codigo}</p>}
                            <p className="text-sm font-semibold text-ink truncate">{p.nombre}</p>
                            <p className="text-xs text-ink-2">
                              {p.nombre_categoria && <span>{p.nombre_categoria} &nbsp;·&nbsp; </span>}
                              {sinStock ? <span className="text-danger font-medium">Sin stock</span> : <span>Stock: {p.stock_actual}</span>}
                            </p>
                          </div>
                          <p className="text-sm font-bold text-ink flex-shrink-0">{COP(p.precio_venta)}</p>
                        </button>
                      )
                    })}
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Shortcuts (solo desktop ancho) */}
        <div className="hidden xl:flex items-center gap-3 text-xs text-ink-2 flex-shrink-0">
          <span><kbd className="bg-surface-soft border border-border rounded px-1.5 py-0.5 font-mono text-xs">F2</kbd> Cliente</span>
          <span><kbd className="bg-surface-soft border border-border rounded px-1.5 py-0.5 font-mono text-xs">F3</kbd> Cobrar</span>
          <span><kbd className="bg-surface-soft border border-border rounded px-1.5 py-0.5 font-mono text-xs">+/-</kbd> Cantidad</span>
        </div>

        {/* Feedback scanner */}
        {scanMsg && (
          <span className={`text-xs font-medium px-3 py-1 rounded-lg flex-shrink-0 ${
            scanMsg.tipo === 'ok' ? 'bg-green-50 text-success border border-green-200' : 'bg-red-50 text-danger border border-red-200'
          }`}>
            {scanMsg.texto}
          </span>
        )}
      </header>

      {/* ── CONTENIDO PRINCIPAL ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* ════ PANEL IZQUIERDO: items del carrito ════ */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {carrito.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-ink-2 select-none">
              <ShoppingCart size={56} className="mb-4 opacity-10" />
              <p className="text-base font-medium">Carrito vacío</p>
              <p className="text-sm mt-1 opacity-50">Busca un producto arriba o escanea un código</p>
            </div>
          ) : (
            <div className="space-y-2">
              {carrito.map(item => {
                const itemTotal = item.precio_unitario * item.cantidad * (1 - item.descuento / 100)
                return (
                  <div key={item.producto_id}
                    className="bg-white rounded-xl border border-border px-4 py-3 flex items-center gap-4">
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      {item.codigo && (
                        <p className="font-mono text-xs text-accent font-semibold mb-0.5">{item.codigo}</p>
                      )}
                      <p className="text-sm font-semibold text-ink leading-tight">{item.nombre}</p>
                      <p className="text-xs text-ink-2 mt-0.5">{COP(item.precio_unitario)} c/u
                        {item.descuento > 0 && <span className="ml-2 text-accent font-medium">-{item.descuento}%</span>}
                      </p>
                    </div>

                    {/* Cantidad */}
                    <div className="flex items-center border border-border rounded-lg bg-white overflow-hidden flex-shrink-0">
                      <button
                        onClick={() => actualizarCantidad(item.producto_id, item.cantidad - 1)}
                        className="px-2.5 py-1.5 text-ink-2 hover:bg-surface-soft hover:text-ink transition-colors"
                      >
                        <Minus size={12} />
                      </button>
                      <span className="px-3 py-1.5 text-sm font-bold text-ink border-x border-border min-w-[2.5rem] text-center">
                        {item.cantidad}
                      </span>
                      <button
                        onClick={() => actualizarCantidad(item.producto_id, item.cantidad + 1)}
                        disabled={item.cantidad >= item.stock_actual}
                        className="px-2.5 py-1.5 text-ink-2 hover:bg-surface-soft hover:text-ink transition-colors disabled:opacity-30"
                      >
                        <Plus size={12} />
                      </button>
                    </div>

                    {/* Total ítem */}
                    <p className="text-sm font-bold text-ink w-20 text-right flex-shrink-0">{COP(itemTotal)}</p>

                    {/* Eliminar */}
                    <button
                      onClick={() => removerItem(item.producto_id)}
                      className="text-ink-2 hover:text-danger transition-colors flex-shrink-0 p-1"
                    >
                      <X size={14} />
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* ════ PANEL DERECHO: orden ════ */}
        {/* Overlay móvil */}
        {showOrderPanel && (
          <div className="fixed inset-0 bg-black/40 z-40 md:hidden" onClick={() => setShowOrderPanel(false)} />
        )}

        <div className={`
          fixed inset-x-0 bottom-0 z-50 bg-white rounded-t-2xl shadow-2xl max-h-[92vh] overflow-hidden
          flex flex-col transform transition-transform
          ${showOrderPanel ? 'translate-y-0' : 'translate-y-full'}
          md:relative md:inset-auto md:translate-y-0 md:max-h-none
          md:shadow-none md:rounded-none md:w-72 md:flex-shrink-0 md:border-l md:border-border
        `}>

          {/* Handle móvil */}
          <div className="md:hidden flex justify-center pt-3 pb-1 flex-shrink-0">
            <div className="w-10 h-1 bg-border rounded-full" />
          </div>

          {/* Cliente */}
          <div className="px-4 py-3 border-b border-border flex-shrink-0">
            <button
              onClick={() => setShowClienteModal(true)}
              className="w-full flex items-center gap-2 text-sm text-ink-2 hover:text-ink transition-colors group"
            >
              <User size={14} className="flex-shrink-0" />
              {clienteSeleccionado
                ? <span className="font-medium text-ink truncate flex-1">{clienteSeleccionado.nombre}</span>
                : <span className="flex-1 truncate">Consumidor final</span>
              }
              <span className="text-xs opacity-40 font-mono">F2</span>
              {clienteSeleccionado && (
                <span
                  onMouseDown={e => { e.stopPropagation(); setCliente(null) }}
                  className="text-ink-2 hover:text-danger ml-1"
                >
                  <X size={12} />
                </span>
              )}
            </button>
          </div>

          {/* Totales */}
          <div className="px-4 py-4 border-b border-border flex-shrink-0 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-ink-2">Subtotal</span>
              <span className="text-ink">{COP(subtotal)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-ink-2">IVA</span>
              <span className="text-ink">{COP(iva)}</span>
            </div>
            <div className="flex justify-between text-base font-bold border-t border-border pt-2">
              <span className="text-ink">Total</span>
              <span className="text-ink">{COP(total)}</span>
            </div>
          </div>

          {/* Método de pago */}
          <div className="border-b border-border flex-shrink-0">
            <MetodoPago />
          </div>

          {/* Botón cobrar */}
          <div className="px-4 py-3 flex-shrink-0">
            <button
              onClick={() => carrito.length > 0 && setShowCobroModal(true)}
              disabled={carrito.length === 0}
              className="w-full py-3.5 rounded-xl font-bold text-sm transition-colors disabled:opacity-30 text-white bg-accent hover:bg-accent/90 flex items-center justify-center gap-2"
            >
              {carrito.length === 0
                ? 'Carrito vacío'
                : <>{COP(total)} &nbsp;<span className="text-xs bg-white/20 px-1.5 py-0.5 rounded font-mono">F3</span></>
              }
            </button>
          </div>

          {/* Espacio flexible */}
          <div className="flex-1 min-h-0" />

          {/* Acciones de caja */}
          <div className="px-4 pb-4 pt-3 border-t border-border flex-shrink-0 space-y-1.5">
            <p className="text-xs font-bold text-ink-2 uppercase tracking-widest mb-2">Caja</p>

            {qzTray.conectado && qzTray.impTermica && (
              <button
                onClick={() => qzTray.abrirGaveta()}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-ink-2 hover:bg-surface-soft hover:text-ink transition-colors"
              >
                <Unlock size={14} className="flex-shrink-0" />
                Abrir gaveta
              </button>
            )}

            {carrito.length > 0 && (
              <button
                onClick={limpiarCarrito}
                className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-ink-2 hover:bg-red-50 hover:text-danger transition-colors"
              >
                <Trash2 size={14} className="flex-shrink-0" />
                Limpiar carrito
              </button>
            )}

            <button
              onClick={() => navigate('/caja/abrir')}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-ink-2 hover:bg-surface-soft hover:text-ink transition-colors"
            >
              <LogOut size={14} className="flex-shrink-0" />
              Cerrar turno
            </button>

            <button
              onClick={() => navigate('/cajas')}
              className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-ink-2 hover:bg-surface-soft hover:text-ink transition-colors"
            >
              <Calculator size={14} className="flex-shrink-0" />
              Cuadrar caja
            </button>
          </div>
        </div>

        {/* Botón flotante panel orden (solo móvil) */}
        <div className="fixed bottom-5 right-5 z-40 md:hidden">
          <button
            onClick={() => setShowOrderPanel(true)}
            className="bg-accent text-white rounded-full shadow-lg px-4 py-3 flex items-center gap-2 font-semibold text-sm"
          >
            <ShoppingCart size={17} />
            {carrito.length > 0 && (
              <span className="bg-white text-accent text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                {carrito.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* ── Modal: cliente ── */}
      <Modal isOpen={showClienteModal} onClose={() => setShowClienteModal(false)} title="Seleccionar cliente">
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-2" />
            <input
              autoFocus
              id="cliente-search"
              name="cliente-search"
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

      {/* ── Modal: cobro ── */}
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
                id="efectivo-recibido"
                name="efectivo-recibido"
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

      {/* ── Modal: resultado venta ── */}
      <Modal isOpen={showTicketModal} onClose={() => setShowTicketModal(false)} title="" size="sm">
        {ventaResult && (
          <div className="text-center space-y-4 py-2">
            <CheckCircle2 className="w-12 h-12 text-success mx-auto" />
            <div>
              <p className="text-lg font-bold text-ink">{COP(ventaResult.total)}</p>
              <p className="text-sm text-ink-2 mt-1">
                {ventaResult.numero_factura ? `Factura ${ventaResult.numero_factura}` : 'Venta registrada'}
                {qzTray.conectado && qzTray.impTermica && ' · Ticket impreso'}
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
