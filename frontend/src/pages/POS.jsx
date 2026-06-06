import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import {
  Search, User, AlertCircle, Loader2, CheckCircle2, X, Trash2,
  ArrowLeft, ShoppingCart, Barcode, Plus, Minus, Unlock, LogOut, Calculator,
  DollarSign, Clock, AlertTriangle,
} from 'lucide-react'
import { toast } from 'sonner'
import { usePOSStore } from '../store/posStore'
import { useUIStore } from '../store/uiStore'
import { posService } from '../services/pos'
import { cajasService } from '../services/cajas'
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
  const logoEmpresa = localStorage.getItem('carolina_logo') || null
  const [ahora, setAhora] = useState(new Date())
  useEffect(() => {
    const t = setInterval(() => setAhora(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  const { data: sesionActiva, isLoading: loadingSesion } = useQuery({
    queryKey: ['sesion-activa'],
    queryFn: cajasService.getSesionActiva,
    staleTime: 30000,
  })

  // ── Modal caja: abrir al inicio del día ──────────────────────────
  const [modalCaja,       setModalCaja]       = useState(null) // null | 'cerrar_anterior' | 'abrir'
  const [fondoModal,      setFondoModal]       = useState('')
  const [cajaIdModal,     setCajaIdModal]      = useState('')
  const [contadoAnterior, setContadoAnterior]  = useState('')
  const [errorModal,      setErrorModal]       = useState('')

  const { data: cajasActivas = [] } = useQuery({
    queryKey: ['cajas'],
    queryFn: cajasService.getCajas,
    select: d => d.filter(c => c.activa),
    enabled: modalCaja === 'abrir',
  })

  const abrirCajaMutation = useMutation({
    mutationFn: (datos) => cajasService.abrirSesion(datos),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sesion-activa'] })
      setModalCaja(null)
      setFondoModal('')
      setCajaIdModal('')
      setTimeout(() => searchRef.current?.focus(), 100)
    },
    onError: (err) => setErrorModal(err?.response?.data?.error || 'Error al abrir la caja'),
  })

  const cerrarAnteriorMutation = useMutation({
    mutationFn: ({ id, datos }) => cajasService.cerrarSesion(id, datos),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['sesion-activa'] })
      setModalCaja('abrir')
      setContadoAnterior('')
      setErrorModal('')
    },
    onError: (err) => setErrorModal(err?.response?.data?.error || 'Error al cerrar la sesión anterior'),
  })

  useEffect(() => {
    if (loadingSesion) return
    if (sesionActiva === undefined) return
    if (sesionActiva === null) { setModalCaja('abrir'); return }
    const apertura = new Date(sesionActiva.fecha_apertura)
    const hoy = new Date()
    const esHoy = apertura.getFullYear() === hoy.getFullYear() &&
                  apertura.getMonth()    === hoy.getMonth()    &&
                  apertura.getDate()     === hoy.getDate()
    if (!esHoy) setModalCaja('cerrar_anterior')
  }, [sesionActiva, loadingSesion])

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
      if (showCobroModal || showClienteModal || showTicketModal || modalCaja) return

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
  }, [showCobroModal, showClienteModal, showTicketModal, modalCaja, searchResults, procesarEscaneo, agregarDesdeResultado, actualizarCantidad, scan])

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
          {logoEmpresa ? (
            <img src={logoEmpresa} alt="Logo empresa" className="h-8 max-w-[160px] object-contain" />
          ) : (
            <>
              <span className="w-7 h-7 rounded-full bg-accent flex items-center justify-center font-bold text-sm text-white">C</span>
              <span className="font-semibold text-sm text-ink flex items-center">
                Carolina<span className="bg-accent text-white font-bold text-xs px-1.5 py-0.5 rounded ml-1">POS</span>
              </span>
            </>
          )}
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

        {/* ════ PANEL IZQUIERDO: tabla del carrito ════ */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {carrito.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-ink-2 select-none">
              <ShoppingCart size={56} className="mb-4 opacity-10" />
              <p className="text-base font-medium">Carrito vacío</p>
              <p className="text-sm mt-1 opacity-50">Busca un producto arriba o escanea un código</p>
            </div>
          ) : (
            <div className="flex flex-col h-full overflow-hidden">
              {/* Cabecera tabla */}
              <div className="flex-shrink-0 bg-surface-soft border-b border-border px-5 py-3 grid items-center text-xs font-bold text-ink-2 uppercase tracking-wider"
                style={{ gridTemplateColumns: '110px 1fr 140px 110px 110px 32px' }}>
                <span>SKU</span>
                <span>Producto</span>
                <span className="text-center">Cantidad</span>
                <span className="text-right">Precio</span>
                <span className="text-right">Total</span>
                <span />
              </div>

              {/* Filas */}
              <div className="flex-1 overflow-y-auto divide-y divide-border">
                {carrito.map(item => {
                  const itemTotal = item.precio_unitario * item.cantidad * (1 - item.descuento / 100)
                  return (
                    <div key={item.producto_id}
                      className="grid items-center px-5 py-3.5 hover:bg-white transition-colors"
                      style={{ gridTemplateColumns: '110px 1fr 140px 110px 110px 32px' }}>

                      {/* SKU */}
                      <span className="font-mono text-xs text-accent font-semibold pr-2 overflow-hidden text-ellipsis whitespace-nowrap" title={item.codigo || ''}>
                        {item.codigo || '—'}
                      </span>

                      {/* Producto */}
                      <div className="min-w-0 pr-3">
                        <p className="text-sm font-semibold text-ink leading-snug truncate">{item.nombre}</p>
                        {item.descuento > 0 && (
                          <span className="text-xs text-accent font-medium">-{item.descuento}%</span>
                        )}
                      </div>

                      {/* Cantidad +/- */}
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => actualizarCantidad(item.producto_id, item.cantidad - 1)}
                          className="w-7 h-7 flex items-center justify-center rounded-lg border border-border text-ink-2 hover:bg-surface-soft hover:text-ink transition-colors flex-shrink-0"
                        >
                          <Minus size={11} />
                        </button>
                        <span className="text-sm font-bold text-ink w-8 text-center">{item.cantidad}</span>
                        <button
                          onClick={() => actualizarCantidad(item.producto_id, item.cantidad + 1)}
                          disabled={item.cantidad >= item.stock_actual}
                          className="w-7 h-7 flex items-center justify-center rounded-lg border border-border text-ink-2 hover:bg-surface-soft hover:text-ink transition-colors flex-shrink-0 disabled:opacity-30"
                        >
                          <Plus size={11} />
                        </button>
                      </div>

                      {/* Precio unit */}
                      <span className="text-sm text-ink-2 text-right">{COP(item.precio_unitario)}</span>

                      {/* Total */}
                      <span className="text-sm font-bold text-ink text-right">{COP(itemTotal)}</span>

                      {/* Eliminar */}
                      <button
                        onClick={() => removerItem(item.producto_id)}
                        className="flex items-center justify-center text-ink-2 hover:text-danger transition-colors p-0.5 ml-1"
                      >
                        <X size={13} />
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        {/* ════ PANEL DERECHO: orden ════ */}
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

          {/* Fecha y hora */}
          <div className="px-4 py-3 border-b border-border flex-shrink-0 flex items-center justify-between">
            <span className="text-xs text-ink-2 font-medium capitalize">
              {ahora.toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' })}
            </span>
            <span className="text-sm font-bold text-ink font-mono tabular-nums">
              {ahora.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}
            </span>
          </div>

          {/* Cliente */}
          <div className="px-4 py-3 border-b border-border flex-shrink-0">
            <button
              onClick={() => setShowClienteModal(true)}
              className="w-full flex items-center gap-2 text-sm text-ink-2 hover:text-ink transition-colors"
            >
              <User size={14} className="flex-shrink-0" />
              {clienteSeleccionado
                ? <span className="font-medium text-ink truncate flex-1">{clienteSeleccionado.nombre}</span>
                : <span className="flex-1 truncate">Consumidor final</span>
              }
              <span className="text-xs opacity-40 font-mono">F2</span>
              {clienteSeleccionado && (
                <span onMouseDown={e => { e.stopPropagation(); setCliente(null) }} className="text-ink-2 hover:text-danger ml-1">
                  <X size={12} />
                </span>
              )}
            </button>
          </div>

          {/* Método de pago */}
          <div className="border-b border-border flex-shrink-0">
            <MetodoPago />
          </div>

          {/* Espacio flexible */}
          <div className="flex-1 min-h-0" />

          {/* Totales + cobrar — pegados al fondo */}
          <div className="px-4 pt-4 pb-3 border-t border-border flex-shrink-0 flex flex-col gap-3">
            {/* Totales */}
            <div className="space-y-1.5">
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

            <button
              onClick={() => carrito.length > 0 && setShowCobroModal(true)}
              disabled={carrito.length === 0}
              className="w-full py-4 rounded-xl font-bold text-base transition-colors disabled:opacity-30 text-white bg-accent hover:bg-accent/90 flex items-center justify-center gap-2"
            >
              {carrito.length === 0
                ? 'Carrito vacío'
                : <>{COP(total)} &nbsp;<span className="text-xs bg-white/20 px-1.5 py-0.5 rounded font-mono">F3</span></>
              }
            </button>

            {/* Acciones de caja — siempre visibles */}
            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => qzTray.abrirGaveta()}
                disabled={!qzTray.conectado || !qzTray.impTermica}
                title={!qzTray.conectado ? 'Servidor de impresión no conectado' : ''}
                className="flex flex-col items-center gap-1.5 px-2 py-2.5 rounded-xl border border-border text-xs font-medium text-ink-2 hover:bg-surface-soft hover:text-ink transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Unlock size={15} />
                Gaveta
              </button>

              <button
                onClick={limpiarCarrito}
                disabled={carrito.length === 0}
                className="flex flex-col items-center gap-1.5 px-2 py-2.5 rounded-xl border border-border text-xs font-medium text-ink-2 hover:bg-red-50 hover:text-danger hover:border-red-200 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <Trash2 size={15} />
                Limpiar
              </button>

              <button
                onClick={() => {
                  const id = sesionActiva?.id
                  if (id) navigate(`/caja/cerrar/${id}`)
                  else navigate('/caja/abrir')
                }}
                className="flex flex-col items-center gap-1.5 px-2 py-2.5 rounded-xl border border-border text-xs font-medium text-ink-2 hover:bg-surface-soft hover:text-ink transition-colors"
              >
                <Calculator size={15} />
                Cerrar caja
              </button>
            </div>
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

      {/* ── Modal: abrir / cerrar caja al inicio del día ── */}
      {modalCaja && (
        <div className="fixed inset-0 bg-black/60 z-[200] flex items-center justify-center p-4">
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">

            {/* Botón salir — esquina superior derecha */}
            <button
              onClick={() => navigate('/dashboard')}
              className="absolute top-3 right-3 z-10 p-1.5 rounded-lg text-ink-2 hover:text-ink hover:bg-surface-soft transition-colors"
              title="Volver al menú"
            >
              <X size={16} />
            </button>

            {/* ── Paso 1: cerrar sesión sin cerrar del día anterior ── */}
            {modalCaja === 'cerrar_anterior' && sesionActiva && (
              <>
                <div className="bg-amber-50 border-b border-amber-200 px-6 py-4 flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-semibold text-amber-800">Caja sin cerrar</p>
                    <p className="text-xs text-amber-600 mt-0.5">
                      El turno del {new Date(sesionActiva.fecha_apertura).toLocaleDateString('es-CO', {
                        weekday: 'long', day: 'numeric', month: 'long'
                      })} nunca fue cerrado. Debes cerrarlo antes de comenzar hoy.
                    </p>
                  </div>
                </div>
                <div className="px-6 py-5 space-y-4">
                  <div className="bg-surface-soft rounded-xl p-4 text-xs text-ink-2 space-y-1.5">
                    <div className="flex justify-between">
                      <span>Apertura</span>
                      <span className="font-medium text-ink">
                        {new Date(sesionActiva.fecha_apertura).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' })}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Fondo inicial</span>
                      <span className="font-medium text-ink">{COP(sesionActiva.fondo_inicial || 0)}</span>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-sm font-medium text-ink">
                      ¿Cuánto efectivo había en caja?
                    </label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-2" />
                      <input
                        type="number" min="0" step="1000" autoFocus
                        value={contadoAnterior}
                        onChange={e => { setContadoAnterior(e.target.value); setErrorModal('') }}
                        placeholder="0"
                        className="w-full pl-9 pr-3 py-2.5 border border-border rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-colors"
                      />
                    </div>
                    {contadoAnterior && !isNaN(Number(contadoAnterior)) && (
                      <p className="text-xs text-ink-2">{COP(Number(contadoAnterior))}</p>
                    )}
                  </div>

                  {errorModal && <p className="text-xs text-danger">{errorModal}</p>}

                  <button
                    disabled={contadoAnterior === '' || cerrarAnteriorMutation.isPending}
                    onClick={() => {
                      if (contadoAnterior === '') return
                      cerrarAnteriorMutation.mutate({
                        id: sesionActiva.id,
                        datos: { efectivo_contado: Number(contadoAnterior), tipo_cierre: 'cierre_final' },
                      })
                    }}
                    className="w-full flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-600 text-white font-semibold py-3 rounded-xl text-sm transition-colors disabled:opacity-50"
                  >
                    {cerrarAnteriorMutation.isPending
                      ? <><Loader2 className="w-4 h-4 animate-spin" /> Cerrando...</>
                      : 'Cerrar turno anterior y continuar'
                    }
                  </button>
                </div>
              </>
            )}

            {/* ── Paso 2: abrir caja de hoy ── */}
            {modalCaja === 'abrir' && (
              <>
                <div className="px-6 pt-6 pb-2 text-center">
                  <div className="w-12 h-12 bg-accent rounded-full flex items-center justify-center mx-auto mb-3">
                    <span className="text-white text-lg font-bold">
                      {user?.nombre?.charAt(0)?.toUpperCase() || 'U'}
                    </span>
                  </div>
                  <h2 className="text-base font-semibold text-ink">
                    Hola, {user?.nombre?.split(' ')[0] || 'usuario'}
                  </h2>
                  <p className="text-xs text-ink-2 mt-1 flex items-center justify-center gap-1">
                    <Clock className="w-3 h-3" />
                    {new Date().toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' })}
                  </p>
                </div>

                <div className="px-6 pb-6 pt-4 space-y-4">
                  {cajasActivas.length > 1 && (
                    <div className="space-y-1.5">
                      <label className="block text-sm font-medium text-ink">Caja</label>
                      <select
                        value={cajaIdModal}
                        onChange={e => { setCajaIdModal(e.target.value); setErrorModal('') }}
                        className="w-full px-3 py-2.5 border border-border rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-colors"
                      >
                        <option value="">Seleccionar caja...</option>
                        {cajasActivas.map(c => (
                          <option key={c.id} value={c.id}>{c.nombre}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <label className="block text-sm font-medium text-ink">¿Con cuánto abre la caja hoy?</label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-2" />
                      <input
                        type="number" min="0" step="1000"
                        autoFocus={cajasActivas.length <= 1}
                        value={fondoModal}
                        onChange={e => { setFondoModal(e.target.value); setErrorModal('') }}
                        onKeyDown={e => {
                          if (e.key === 'Enter') {
                            e.preventDefault()
                            const multijaja = cajasActivas.length > 1
                            if (multijaja && !cajaIdModal) { setErrorModal('Selecciona una caja'); return }
                            if (fondoModal === '') { setErrorModal('Ingresa el fondo (puede ser 0)'); return }
                            abrirCajaMutation.mutate({
                              fondo_inicial: Number(fondoModal),
                              ...(cajaIdModal ? { caja_id: cajaIdModal } : {}),
                            })
                          }
                        }}
                        placeholder="0"
                        className="w-full pl-9 pr-3 py-2.5 border border-border rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-colors"
                      />
                    </div>
                    {fondoModal && !isNaN(Number(fondoModal)) && (
                      <p className="text-xs text-ink-2">{COP(Number(fondoModal))}</p>
                    )}
                  </div>

                  {errorModal && <p className="text-xs text-danger">{errorModal}</p>}

                  <button
                    disabled={abrirCajaMutation.isPending}
                    onClick={() => {
                      const multiCaja = cajasActivas.length > 1
                      if (multiCaja && !cajaIdModal) { setErrorModal('Selecciona una caja'); return }
                      if (fondoModal === '') { setErrorModal('Ingresa el fondo (puede ser 0)'); return }
                      abrirCajaMutation.mutate({
                        fondo_inicial: Number(fondoModal),
                        ...(cajaIdModal ? { caja_id: cajaIdModal } : {}),
                      })
                    }}
                    className="w-full flex items-center justify-center gap-2 bg-accent hover:bg-accent/90 text-white font-semibold py-3 rounded-xl text-sm transition-colors disabled:opacity-50"
                  >
                    {abrirCajaMutation.isPending
                      ? <><Loader2 className="w-4 h-4 animate-spin" /> Abriendo...</>
                      : <><ShoppingCart className="w-4 h-4" /> Iniciar caja</>
                    }
                  </button>
                </div>
              </>
            )}

          </div>
        </div>
      )}
    </div>
  )
}
