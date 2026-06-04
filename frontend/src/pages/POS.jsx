import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { Search, User, AlertCircle, Loader2, CheckCircle2, X, Trash2, ArrowLeft } from 'lucide-react'
import { usePOSStore } from '../store/posStore'
import { useUIStore } from '../store/uiStore'
import { posService } from '../services/pos'
import { clientesService } from '../services/clientes'
import { productosService } from '../services/productos'
import { TicketImpresion } from '../components/POS/TicketImpresion'
import { FacturaA4 } from '../components/POS/FacturaA4'
import { MetodoPago } from '../components/POS/MetodoPago'
import { Modal } from '../components/Common/Modal'
import { useAuth } from '../context/AuthContext'
import { useSounds } from '../hooks/useSounds'
import { useQZTray } from '../hooks/useQZTray'
import { buildTicket } from '../lib/escpos'
import { buildTicketHTML } from '../lib/ticketHtml'
import { COP } from '../lib/format'

export default function POS() {
  const qc = useQueryClient()
  const navigate = useNavigate()
  const { tenant } = useAuth()
  const { success: soundSuccess, error: soundError, scan } = useSounds()
  const qzTray = useQZTray()
  const { setSidebar } = useUIStore()
  const [vistaTicket, setVistaTicket] = useState('ticket')

  // Ref siempre actualizado de qzTray para evitar closure stale en onSuccess
  const qzTrayRef = useRef(qzTray)
  useEffect(() => { qzTrayRef.current = qzTray }, [qzTray])

  // Ocultar sidebar al entrar al POS, restaurar al salir
  useEffect(() => {
    setSidebar(false)
    return () => setSidebar(true)
  }, [])

  // Leer configuración del scanner desde localStorage (se configura en Configuración)
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
  const [resultIndex,      setResultIndex]      = useState(-1)  // fila seleccionada con ↑↓
  const [dropdownOpen,     setDropdownOpen]     = useState(false)

  const searchRef    = useRef(null)
  const dropdownRef  = useRef(null)
  const debounceRef  = useRef(null)
  const scanBuffer   = useRef('')
  const bufferStart  = useRef(null)
  const scanTimer    = useRef(null)
  const lastAdded    = useRef(null)

  // Debounce: espera 250ms antes de buscar
  useEffect(() => {
    clearTimeout(debounceRef.current)
    if (searchText.length === 0) { setSearchDebounced(''); setDropdownOpen(false); setResultIndex(-1); return }
    debounceRef.current = setTimeout(() => {
      setSearchDebounced(searchText)
      setDropdownOpen(true)
      setResultIndex(-1)
    }, 250)
    return () => clearTimeout(debounceRef.current)
  }, [searchText])

  // Cerrar dropdown al clic fuera
  useEffect(() => {
    const handler = (e) => {
      if (!dropdownRef.current?.contains(e.target) && e.target !== searchRef.current) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

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

  // ── Buscar con debounce ────────────────────────────────
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
    setDropdownOpen(false)
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

  // ── Teclado global (capture phase = antes que el input lo reciba) ──
  useEffect(() => {
    const onKey = async (e) => {
      if (showCobroModal || showClienteModal || showTicketModal) return

      const enInput = (e.target.tagName.toLowerCase() === 'input' || e.target.tagName.toLowerCase() === 'textarea')
      const enBuscador = e.target === searchRef.current

      // ── + : sumar 1 al último producto agregado ──
      if ((e.key === '+' || e.key === 'Add') && !enInput) {
        e.preventDefault()
        if (lastAdded.current) {
          const item = usePOSStore.getState().carrito.find(i => i.producto_id === lastAdded.current)
          if (item && item.cantidad < item.stock_actual) {
            actualizarCantidad(item.producto_id, item.cantidad + 1)
            scan()
          }
        }
        return
      }

      // ── - : restar 1 al último producto agregado ──
      if ((e.key === '-' || e.key === 'Subtract') && !enInput) {
        e.preventDefault()
        if (lastAdded.current) {
          const item = usePOSStore.getState().carrito.find(i => i.producto_id === lastAdded.current)
          if (item) actualizarCantidad(item.producto_id, item.cantidad - 1)
        }
        return
      }

      // ── F2 / F3 ──
      if (e.key === 'F2') { e.preventDefault(); setShowClienteModal(true); return }
      if (e.key === 'F3') { e.preventDefault(); if (usePOSStore.getState().carrito.length > 0) setShowCobroModal(true); return }

      // ── Flechas ↑↓ para navegar resultados del dropdown ──
      if (e.key === 'ArrowDown' && enBuscador) {
        e.preventDefault()
        setResultIndex(i => Math.min(i + 1, (searchResults?.productos?.length || 1) - 1))
        setDropdownOpen(true)
        return
      }
      if (e.key === 'ArrowUp' && enBuscador) {
        e.preventDefault()
        setResultIndex(i => Math.max(i - 1, 0))
        return
      }

      // ── Escape: limpiar búsqueda ──
      if (e.key === 'Escape' && enBuscador) {
        setSearchText(''); setSearchDebounced(''); setDropdownOpen(false); setResultIndex(-1)
        return
      }

      // ── Enter ──
      if (e.key === 'Enter') {
        const code    = scanBuffer.current.trim()
        const start   = bufferStart.current
        const elapsed = start ? Date.now() - start : Infinity
        scanBuffer.current  = ''
        bufferStart.current = null
        clearTimeout(scanTimer.current)

        // Si hay código acumulado y llegó rápido → scanner
        if (code.length >= scannerMin && elapsed < 400) {
          e.preventDefault()
          await procesarEscaneo(code)
          return
        }

        // Si hay un resultado seleccionado con flechas → agregar ese
        if (enBuscador && resultIndex >= 0 && searchResults?.productos?.[resultIndex]) {
          e.preventDefault()
          agregarDesdeResultado(searchResults.productos[resultIndex])
          return
        }

        // Si hay un solo resultado → agregar directo
        if (enBuscador && searchResults?.productos?.length === 1) {
          e.preventDefault()
          agregarDesdeResultado(searchResults.productos[0])
          return
        }

        // Si hay texto y múltiples resultados → agregar el primero
        if (enBuscador && searchResults?.productos?.length > 1 && resultIndex === -1) {
          e.preventDefault()
          agregarDesdeResultado(searchResults.productos[0])
          return
        }

        // Enter fuera de inputs sin búsqueda → confirmar venta
        if (!enInput && usePOSStore.getState().carrito.length > 0) {
          e.preventDefault()
          setShowCobroModal(true)
        }
        return
      }

      // ── Acumular caracteres para detección de scanner ──
      // Usamos capture=true: si vienen muy rápido los interceptamos y evitamos
      // que lleguen al input de búsqueda
      if (e.key.length === 1) {
        const now = Date.now()
        const gap = bufferStart.current ? now - (bufferStart.current + scanBuffer.current.length * 20) : Infinity

        if (scanBuffer.current.length === 0) {
          bufferStart.current = now
          scanBuffer.current  = e.key
        } else {
          scanBuffer.current += e.key
        }

        // Si los caracteres llegan muy rápido (scanner), no dejar que vayan al input
        const sinceStart = now - (bufferStart.current || now)
        if (sinceStart < scannerMs && scanBuffer.current.length > 1) {
          // Velocidad de scanner detectada — bloquear el input
          if (enBuscador) e.preventDefault()
        }

        clearTimeout(scanTimer.current)
        scanTimer.current = setTimeout(() => {
          scanBuffer.current  = ''
          bufferStart.current = null
        }, 300)
      }
    }

    // capture: true → capturamos antes de que llegue al input
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
      const modoDemo = !tenant?.alegra_conectado

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

      // ── Imprimir ticket + abrir gaveta automáticamente ──
      // Usamos ref para evitar closure stale — siempre tiene el qzTray más reciente
      const qt = qzTrayRef.current
      if (qt.conectado && qt.impTermica) {
        try {
          const cmds = buildTicket({
            empresa:        tenant || {},
            venta:          ventaFinal,
            cliente:        clienteSeleccionado,
            cajero:         user?.nombre || '',
            modoDemo,
            W:              qt.anchoCars,
            densidad:       qt.densidad,
            avancePapel:    qt.avancePapel,
            modoCortePapel: qt.modoCortePapel,
          })
          await qt.imprimirTicket(cmds)
        } catch (e) {
          console.warn('Error imprimiendo ticket automático:', e.message)
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
    <div className="flex h-screen bg-gray-50">

      {/* ══ ÁREA IZQUIERDA: búsqueda + tabla ══ */}
      <div className="flex-1 flex flex-col min-w-0 p-4 gap-3">

        {/* Barra superior */}
        <div className="flex items-center gap-3">
          {/* Salir del POS */}
          <button onClick={() => navigate('/dashboard')}
            className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-gray-700 transition-colors">
            <ArrowLeft className="w-4 h-4" />Salir
          </button>

          {/* Modo demo */}
          {!tenant?.alegra_conectado && (
            <span className="flex items-center gap-1.5 text-xs text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-md">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
              Modo demo — sin validez DIAN
            </span>
          )}

          {carrito.length > 0 && (
            <button onClick={limpiarCarrito}
              className="ml-auto flex items-center gap-1 text-xs text-gray-400 hover:text-red-500 transition-colors">
              <Trash2 className="w-3.5 h-3.5" />Limpiar
            </button>
          )}
        </div>

      {/* ── Búsqueda + cliente ── */}
      <div className="flex items-center gap-3">
        {/* Campo de búsqueda / scanner */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
          <input
            ref={searchRef}
            type="text"
            value={searchText}
            onChange={e => { setSearchText(e.target.value); setDropdownOpen(true) }}
            onFocus={() => searchText.length > 0 && setDropdownOpen(true)}
            className="w-full pl-9 pr-9 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-gray-900 hover:border-gray-300"
            placeholder="Buscar por nombre o código... (scanner automático)"
            autoComplete="off"
          />
          {/* Indicador cargando */}
          {buscando && (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-300 animate-spin" />
          )}

          {/* Dropdown resultados */}
          {dropdownOpen && searchDebounced && (
            <div ref={dropdownRef} className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-100 rounded-md shadow-xl z-50 overflow-hidden">
              {productos.length === 0 && !buscando ? (
                <div className="px-4 py-3 text-sm text-gray-400">
                  Sin resultados para <strong>"{searchDebounced}"</strong>
                </div>
              ) : (
                <>
                  {productos.length > 1 && (
                    <div className="px-4 py-2 border-b border-gray-50 flex items-center justify-between">
                      <p className="text-xs text-gray-400">{productos.length} resultados</p>
                      <p className="text-xs text-gray-300">↑↓ navegar · Enter agregar</p>
                    </div>
                  )}
                  {productos.map((p, idx) => {
                    const sinStock = p.stock_actual <= 0
                    const activo = idx === resultIndex
                    return (
                      <button
                        key={p.id}
                        onClick={() => agregarDesdeResultado(p)}
                        disabled={sinStock}
                        className={`w-full text-left px-4 py-2.5 flex items-center justify-between gap-4 transition-colors ${
                          activo ? 'bg-gray-900 text-white' : sinStock ? 'opacity-40 cursor-not-allowed' : 'hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-medium truncate ${activo ? 'text-white' : 'text-gray-900'}`}>
                            {p.nombre}
                          </p>
                          <p className={`text-xs ${activo ? 'text-gray-300' : 'text-gray-400'}`}>
                            {p.codigo && <span className="font-mono">{p.codigo} · </span>}
                            {sinStock ? 'Sin stock' : `${p.stock_actual} uds disponibles`}
                          </p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className={`text-sm font-bold ${activo ? 'text-white' : 'text-gray-900'}`}>
                            {COP(p.precio_venta)}
                          </p>
                          {p.impuesto_iva > 0 && (
                            <p className={`text-xs ${activo ? 'text-gray-300' : 'text-gray-400'}`}>+{p.impuesto_iva}% IVA</p>
                          )}
                        </div>
                      </button>
                    )
                  })}
                </>
              )}
            </div>
          )}
        </div>

        {/* Cliente */}
        <button
          onClick={() => setShowClienteModal(true)}
          className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-md text-sm text-gray-500 hover:border-gray-400 hover:text-gray-800 transition-colors"
        >
          <User className="w-3.5 h-3.5" />
          <span className="max-w-[160px] truncate">
            {clienteSeleccionado ? clienteSeleccionado.nombre : <span className="text-gray-400">Consumidor final <span className="text-gray-300">F2</span></span>}
          </span>
          {clienteSeleccionado && (
            <span onClick={e => { e.stopPropagation(); setCliente(null) }} className="text-gray-300 hover:text-gray-600">
              <X className="w-3 h-3" />
            </span>
          )}
        </button>

        {/* Feedback scanner */}
        {scanMsg && (
          <span className={`text-xs font-medium px-3 py-1.5 rounded-md ${
            scanMsg.tipo === 'ok' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
          }`}>
            {scanMsg.tipo === 'ok' ? '✓' : '✕'} {scanMsg.texto}
          </span>
        )}

        {carrito.length > 0 && (
          <button onClick={limpiarCarrito} className="text-xs text-gray-400 hover:text-red-500 transition-colors flex items-center gap-1 ml-auto">
            <Trash2 className="w-3.5 h-3.5" /> Limpiar
          </button>
        )}
      </div>

      {/* ── Tabla de items ── */}
      <div className="flex-1 bg-white rounded-lg border border-gray-100 overflow-hidden flex flex-col min-h-0">
        {/* Cabecera tabla */}
        <div className="grid grid-cols-[2rem_1fr_8rem_10rem_8rem_2.5rem] gap-x-3 px-5 py-2.5 border-b border-gray-100 text-xs font-semibold text-gray-400 uppercase tracking-wider">
          <span>#</span>
          <span>Producto</span>
          <span>Código</span>
          <span className="text-center">Cantidad</span>
          <span className="text-right">Total</span>
          <span />
        </div>

        {/* Filas */}
        <div className="flex-1 overflow-y-auto">
          {carrito.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-300 py-16">
              <p className="text-sm">Escanea o busca un producto para comenzar</p>
            </div>
          ) : (
            carrito.map((item, idx) => {
              const itemTotal = item.precio_unitario * item.cantidad * (1 - item.descuento / 100)
              return (
                <div
                  key={item.producto_id}
                  className="grid grid-cols-[2rem_1fr_8rem_10rem_8rem_2.5rem] gap-x-3 px-5 py-3 border-b border-gray-50 hover:bg-gray-50 items-center"
                >
                  {/* # */}
                  <span className="text-xs text-gray-300 font-medium">{idx + 1}</span>

                  {/* Nombre + precio unit */}
                  <div>
                    <p className="text-sm font-medium text-gray-900">{item.nombre}</p>
                    <p className="text-xs text-gray-400">{COP(item.precio_unitario)} c/u</p>
                  </div>

                  {/* Código */}
                  <span className="text-xs text-gray-400 font-mono">
                    {item.codigo || '—'}
                  </span>

                  {/* Cantidad */}
                  <div className="flex items-center justify-center gap-2">
                    <button
                      onClick={() => actualizarCantidad(item.producto_id, item.cantidad - 1)}
                      className="w-7 h-7 flex items-center justify-center border border-gray-200 rounded text-gray-500 hover:border-gray-900 hover:text-gray-900 transition-colors text-base leading-none"
                    >−</button>
                    <span className="text-sm font-semibold text-gray-900 w-8 text-center">{item.cantidad}</span>
                    <button
                      onClick={() => actualizarCantidad(item.producto_id, item.cantidad + 1)}
                      disabled={item.cantidad >= item.stock_actual}
                      className="w-7 h-7 flex items-center justify-center border border-gray-200 rounded text-gray-500 hover:border-gray-900 hover:text-gray-900 transition-colors disabled:opacity-30 text-base leading-none"
                    >+</button>
                  </div>

                  {/* Total fila */}
                  <p className="text-sm font-bold text-gray-900 text-right">{COP(itemTotal)}</p>

                  {/* Eliminar */}
                  <button
                    onClick={() => removerItem(item.producto_id)}
                    className="flex items-center justify-center text-gray-300 hover:text-red-500 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )
            })
          )}
        </div>
      </div>

      </div>{/* fin área izquierda */}

      {/* ══ PANEL DERECHO: orden + totales + cobrar ══ */}
      <div className="w-72 flex-shrink-0 bg-white border-l border-gray-100 flex flex-col">

        {/* Cliente */}
        <div className="px-4 py-3 border-b border-gray-100">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Cliente</p>
          <button onClick={() => setShowClienteModal(true)}
            className="w-full flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 transition-colors">
            <User className="w-3.5 h-3.5 flex-shrink-0" />
            {clienteSeleccionado
              ? <span className="font-medium text-gray-900 truncate">{clienteSeleccionado.nombre}</span>
              : <span className="text-gray-400">Consumidor final <span className="text-gray-300">F2</span></span>
            }
            {clienteSeleccionado && (
              <span onClick={e => { e.stopPropagation(); setCliente(null) }}
                className="ml-auto text-gray-300 hover:text-gray-600">
                <X className="w-3 h-3" />
              </span>
            )}
          </button>
        </div>

        {/* Resumen de items */}
        <div className="flex-1 overflow-y-auto px-4 py-3">
          {carrito.length === 0 ? (
            <p className="text-xs text-gray-300 text-center py-8">Sin productos</p>
          ) : (
            <div className="space-y-2">
              {carrito.map(item => {
                const itemTotal = item.precio_unitario * item.cantidad * (1 - item.descuento / 100)
                return (
                  <div key={item.producto_id} className="flex items-center justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-gray-900 truncate">{item.nombre}</p>
                      <p className="text-xs text-gray-400">{item.cantidad} × {COP(item.precio_unitario)}</p>
                    </div>
                    <p className="text-xs font-semibold text-gray-900 flex-shrink-0">{COP(itemTotal)}</p>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Método de pago */}
        <div className="border-t border-gray-100">
          <MetodoPago />
        </div>

        {/* Totales */}
        <div className="px-4 py-3 border-t border-gray-100 space-y-1.5">
          <div className="flex justify-between text-xs text-gray-400">
            <span>Subtotal</span><span>{COP(subtotal)}</span>
          </div>
          <div className="flex justify-between text-xs text-gray-400">
            <span>IVA</span><span>{COP(iva)}</span>
          </div>
          <div className="flex justify-between text-sm font-bold text-gray-900 border-t border-gray-100 pt-2 mt-1">
            <span>Total</span><span>{COP(total)}</span>
          </div>
        </div>

        {/* Botón cobrar */}
        <div className="px-4 pb-4">
          <button
            onClick={() => carrito.length > 0 && setShowCobroModal(true)}
            disabled={carrito.length === 0}
            onKeyDown={e => { if (e.key === 'Enter' && !ventaMutation.isPending) setShowCobroModal(true) }}
            className={`w-full py-3.5 rounded-md font-bold text-sm transition-colors disabled:opacity-30 text-white ${
              tenant?.alegra_conectado ? 'bg-gray-900 hover:bg-gray-700' : 'bg-amber-500 hover:bg-amber-600'
            }`}
          >
            {tenant?.alegra_conectado ? 'Cobrar' : 'Cobrar (demo)'}
            {carrito.length > 0 && <span className="ml-2">{COP(total)}</span>}
            <span className="ml-2 opacity-40 font-normal text-xs">F3</span>
          </button>
          {!tenant?.alegra_conectado && (
            <p className="text-xs text-amber-600 text-center mt-1">Sin validez DIAN</p>
          )}
        </div>
      </div>

      {/* ── Modal: cliente ── */}
      <Modal isOpen={showClienteModal} onClose={() => setShowClienteModal(false)} title="Seleccionar cliente">
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" />
            <input autoFocus type="text" value={clienteSearch} onChange={e => setClienteSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-gray-900"
              placeholder="Buscar por nombre o documento..." />
          </div>
          <button onClick={() => { setCliente(null); setShowClienteModal(false) }}
            className="w-full py-2.5 border border-dashed border-gray-200 rounded-md text-sm text-gray-400 hover:border-gray-400 hover:text-gray-700 transition-colors">
            Consumidor final
          </button>
          <div className="max-h-60 overflow-y-auto divide-y divide-gray-50">
            {clientesData?.clientes?.map(c => (
              <button key={c.id} onClick={() => { setCliente(c); setShowClienteModal(false) }}
                className="w-full text-left px-3 py-2.5 hover:bg-gray-50 transition-colors">
                <p className="text-sm font-medium text-gray-900">{c.nombre}</p>
                <p className="text-xs text-gray-400">{c.tipo_documento}: {c.numero_documento}</p>
              </button>
            ))}
          </div>
        </div>
      </Modal>

      {/* ── Modal: cobro ── */}
      <Modal isOpen={showCobroModal} onClose={() => { setShowCobroModal(false); setErrorVenta('') }} title="Confirmar cobro" size="sm">
        <div className="space-y-5" onKeyDown={e => {
          if (e.key === 'Enter' && !ventaMutation.isPending && !efectivoInsuficiente) {
            e.preventDefault()
            handleCobrar()
          }
        }}>
          <div className="text-center py-2">
            <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Total</p>
            <p className="text-4xl font-bold text-gray-900 tracking-tight">{COP(total)}</p>
            {clienteSeleccionado && <p className="text-xs text-gray-400 mt-1">{clienteSeleccionado.nombre}</p>}
          </div>

          <MetodoPago />

          {metodoPago === 'efectivo' && (
            <div className="space-y-2">
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Efectivo recibido</label>
              <input autoFocus type="number" value={efectivoRecibido} onChange={e => setEfectivoRecibido(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-md text-2xl font-bold text-center focus:outline-none focus:ring-1 focus:ring-gray-900"
                placeholder="0" />
              {efectivoNum >= total && efectivoNum > 0 && (
                <div className="flex justify-between text-sm font-semibold bg-gray-50 rounded-md px-4 py-2.5">
                  <span className="text-gray-500">Vuelto</span>
                  <span className="text-gray-900">{COP(vuelto)}</span>
                </div>
              )}
              {efectivoInsuficiente && <p className="text-xs text-red-500 text-center">Monto insuficiente</p>}
            </div>
          )}

          {errorVenta && (
            <div className="flex items-start gap-2 bg-red-50 text-red-700 text-xs p-3 rounded-md">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />{errorVenta}
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <button onClick={() => { setShowCobroModal(false); setErrorVenta('') }}
              className="flex-1 py-2.5 border border-gray-200 rounded-md text-sm font-medium text-gray-600 hover:bg-gray-50">
              Cancelar
            </button>
            <button onClick={handleCobrar} disabled={ventaMutation.isPending || efectivoInsuficiente}
              className="flex-1 bg-gray-900 text-white py-2.5 rounded-md text-sm font-semibold hover:bg-gray-700 disabled:opacity-40 flex items-center justify-center gap-2">
              {ventaMutation.isPending ? <><Loader2 className="w-4 h-4 animate-spin" />Procesando...</> : 'Confirmar cobro'}
            </button>
          </div>
        </div>
      </Modal>

      {/* ── Modal: resultado venta ── */}
      <Modal isOpen={showTicketModal} onClose={() => setShowTicketModal(false)} title="" size="sm">
        {ventaResult && (
          <div className="text-center space-y-4 py-2">
            {/* Ícono y confirmación */}
            <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto" />
            <div>
              <p className="text-lg font-bold text-gray-900">{COP(ventaResult.total)}</p>
              <p className="text-sm text-gray-500 mt-1">
                {ventaResult.numero_factura ? `Factura ${ventaResult.numero_factura}` : 'Venta registrada'}
                {qzTray.conectado && qzTray.impTermica && ' · Ticket impreso'}
              </p>
              {ventaResult.efectivo_recibido > 0 && (
                <p className="text-base font-semibold text-gray-700 mt-2">
                  Vuelto: {COP(Math.max(0, ventaResult.efectivo_recibido - ventaResult.total))}
                </p>
              )}
            </div>

            {/* Opciones secundarias */}
            <div className="flex gap-2 pt-2">
              {/* Reimprimir ticket térmico */}
              {qzTray.conectado && qzTray.impTermica && (
                <button
                  onClick={async () => {
                    try {
                      const cmds = buildTicket({ empresa: tenant || {}, venta: ventaResult, cliente: clienteSeleccionado, cajero: user?.nombre || '', modoDemo: !tenant?.alegra_conectado, W: qzTray.anchoCars, densidad: qzTray.densidad, avancePapel: qzTray.avancePapel, modoCortePapel: qzTray.modoCortePapel })
                      await qzTray.imprimirTicket(cmds)
                    } catch {}
                  }}
                  className="flex-1 py-2 text-xs border border-gray-200 rounded-md text-gray-500 hover:bg-gray-50"
                >
                  Reimprimir ticket
                </button>
              )}
              {/* Factura A4 */}
              <button
                onClick={() => setVistaTicket(vistaTicket === 'a4' ? 'ticket' : 'a4')}
                className="flex-1 py-2 text-xs border border-gray-200 rounded-md text-gray-500 hover:bg-gray-50"
              >
                {vistaTicket === 'a4' ? 'Ocultar factura' : 'Ver factura A4'}
              </button>
            </div>

            {/* Factura A4 expandible */}
            {vistaTicket === 'a4' && (
              <div className="border-t pt-4">
                <FacturaA4 venta={ventaResult} tenant={tenant} cliente={clienteSeleccionado} />
              </div>
            )}

            {/* Nueva venta */}
            <button
              onClick={() => { setShowTicketModal(false); setVistaTicket('ticket') }}
              className="w-full bg-gray-900 text-white py-3 rounded-md font-semibold text-sm hover:bg-gray-700"
            >
              Nueva venta
            </button>
          </div>
        )}
      </Modal>
    </div>
  )
}
