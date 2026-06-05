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
  const { tenant, user } = useAuth()
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

      // ── Imprimir ticket + abrir gaveta automáticamente ──
      const qt = qzTrayRef.current
      console.log('[AUTO-PRINT] conectado:', qt.conectado, 'impTermica:', qt.impTermica)
      if (qt.conectado && qt.impTermica) {
        try {
          const anchoPapel = localStorage.getItem('carolina_printer_ancho') || '80'
          const W = anchoPapel === '58' ? 32 : 48
          console.log('[AUTO-PRINT] Imprimiendo con W=', W)
          const cmds = buildTicket({
            empresa:        tenant || {},
            venta:          ventaFinal,
            cliente:        clienteSeleccionado,
            cajero:         user?.nombre || '',
            abrirGaveta:    true,
            modoDemo,
            W,
            densidad:       qt.densidad,
            avancePapel:    qt.avancePapel,
            modoCortePapel: qt.modoCortePapel,
          })
          await qt.imprimirTicket(cmds)
          console.log('[AUTO-PRINT] Ticket enviado OK')
        } catch (e) {
          console.error('[AUTO-PRINT] Error:', e.message, e)
          mostrarMsg(`Error al imprimir: ${e.message}`, 'error')
        }
      } else {
        console.log('[AUTO-PRINT] Skipped - QZ Tray no listo')
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
    <div className="flex h-screen bg-surface-soft">

      {/* ══ ÁREA IZQUIERDA: búsqueda + tabla ══ */}
      <div className="flex-1 flex flex-col min-w-0 p-4 gap-3">

        {/* Barra superior */}
        <div className="flex items-center gap-3">
          {/* Salir del POS */}
          <button onClick={() => navigate('/dashboard')}
            className="flex items-center gap-1.5 text-xs text-ink-2 hover:text-ink transition-colors">
            <ArrowLeft className="w-4 h-4" />Salir
          </button>


          {carrito.length > 0 && (
            <button onClick={limpiarCarrito}
              className="ml-auto flex items-center gap-1 text-xs text-ink-2 hover:text-danger transition-colors">
              <Trash2 className="w-3.5 h-3.5" />Limpiar
            </button>
          )}
        </div>

      {/* ── Búsqueda + cliente ── */}
      <div className="flex items-center gap-3">
        {/* Campo de búsqueda / scanner */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-2" />
          <input
            ref={searchRef}
            type="text"
            value={searchText}
            onChange={e => { setSearchText(e.target.value); setDropdownOpen(true) }}
            onFocus={() => searchText.length > 0 && setDropdownOpen(true)}
            className="w-full pl-9 pr-9 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent hover:border-border-strong transition-colors"
            placeholder="Buscar por nombre o código... (scanner automático)"
            autoComplete="off"
          />
          {/* Indicador cargando */}
          {buscando && (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ink-2 animate-spin" />
          )}

          {/* Dropdown resultados */}
          {dropdownOpen && searchDebounced && (
            <div ref={dropdownRef} className="absolute top-full left-0 right-0 mt-1 bg-white border border-border rounded-xl shadow-xl z-50 overflow-hidden">
              {productos.length === 0 && !buscando ? (
                <div className="px-4 py-3 text-sm text-ink-2">
                  Sin resultados para <strong>"{searchDebounced}"</strong>
                </div>
              ) : (
                <>
                  {productos.length > 1 && (
                    <div className="px-4 py-2 border-b border-border flex items-center justify-between">
                      <p className="text-xs text-ink-2">{productos.length} resultados</p>
                      <p className="text-xs text-ink-2">↑↓ navegar · Enter agregar</p>
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
                          activo ? 'bg-accent text-white' : sinStock ? 'opacity-40 cursor-not-allowed' : 'hover:bg-surface-soft'
                        }`}
                      >
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-medium truncate ${activo ? 'text-white' : 'text-ink'}`}>
                            {p.nombre}
                          </p>
                          <p className={`text-xs ${activo ? 'text-white/70' : 'text-ink-2'}`}>
                            {p.codigo && <span className="font-mono">{p.codigo} · </span>}
                            {sinStock ? 'Sin stock' : `${p.stock_actual} uds disponibles`}
                          </p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className={`text-sm font-bold ${activo ? 'text-white' : 'text-ink'}`}>
                            {COP(p.precio_venta)}
                          </p>
                          {p.impuesto_iva > 0 && (
                            <p className={`text-xs ${activo ? 'text-white/70' : 'text-ink-2'}`}>+{p.impuesto_iva}% IVA</p>
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
          className="flex items-center gap-2 px-3 py-2 border border-border rounded-lg text-sm text-ink-2 hover:border-border-strong hover:text-ink transition-colors"
        >
          <User className="w-3.5 h-3.5" />
          <span className="max-w-[160px] truncate">
            {clienteSeleccionado ? clienteSeleccionado.nombre : <span className="text-ink-2">Consumidor final <span className="text-ink-2/60">F2</span></span>}
          </span>
          {clienteSeleccionado && (
            <span onClick={e => { e.stopPropagation(); setCliente(null) }} className="text-ink-2 hover:text-ink">
              <X className="w-3 h-3" />
            </span>
          )}
        </button>

        {/* Feedback scanner */}
        {scanMsg && (
          <span className={`text-xs font-medium px-3 py-1.5 rounded-lg ${
            scanMsg.tipo === 'ok' ? 'bg-green-50 text-success' : 'bg-red-50 text-danger'
          }`}>
            {scanMsg.tipo === 'ok' ? '✓' : '✕'} {scanMsg.texto}
          </span>
        )}

      </div>

      {/* ── Tabla de items ── */}
      <div className="flex-1 bg-white rounded-xl border border-border overflow-hidden flex flex-col min-h-0">
        {/* Cabecera tabla */}
        <div className="grid grid-cols-[2rem_1fr_8rem_10rem_8rem_2.5rem] gap-x-3 px-5 py-2.5 border-b border-border text-xs font-semibold text-ink-2 uppercase tracking-wider bg-surface-soft">
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
            <div className="flex flex-col items-center justify-center h-full text-ink-2 py-16">
              <p className="text-sm">Escanea o busca un producto para comenzar</p>
            </div>
          ) : (
            carrito.map((item, idx) => {
              const itemTotal = item.precio_unitario * item.cantidad * (1 - item.descuento / 100)
              return (
                <div
                  key={item.producto_id}
                  className="grid grid-cols-[2rem_1fr_8rem_10rem_8rem_2.5rem] gap-x-3 px-5 py-3 border-b border-border hover:bg-surface-soft items-center transition-colors"
                >
                  {/* # */}
                  <span className="text-xs text-ink-2 font-medium">{idx + 1}</span>

                  {/* Nombre + precio unit */}
                  <div>
                    <p className="text-sm font-medium text-ink">{item.nombre}</p>
                    <p className="text-xs text-ink-2">{COP(item.precio_unitario)} c/u</p>
                  </div>

                  {/* Código */}
                  <span className="text-xs text-ink-2 font-mono">
                    {item.codigo || '—'}
                  </span>

                  {/* Cantidad */}
                  <div className="flex items-center justify-center gap-2">
                    <button
                      onClick={() => actualizarCantidad(item.producto_id, item.cantidad - 1)}
                      className="w-7 h-7 flex items-center justify-center border border-border rounded-lg text-ink-2 hover:border-accent hover:text-accent transition-colors text-base leading-none"
                    >−</button>
                    <span className="text-sm font-semibold text-ink w-8 text-center">{item.cantidad}</span>
                    <button
                      onClick={() => actualizarCantidad(item.producto_id, item.cantidad + 1)}
                      disabled={item.cantidad >= item.stock_actual}
                      className="w-7 h-7 flex items-center justify-center border border-border rounded-lg text-ink-2 hover:border-accent hover:text-accent transition-colors disabled:opacity-30 text-base leading-none"
                    >+</button>
                  </div>

                  {/* Total fila */}
                  <p className="text-sm font-bold text-ink text-right">{COP(itemTotal)}</p>

                  {/* Eliminar */}
                  <button
                    onClick={() => removerItem(item.producto_id)}
                    className="flex items-center justify-center text-ink-2 hover:text-danger transition-colors"
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
      <div className="w-72 flex-shrink-0 bg-white border-l border-border flex flex-col">

        {/* Cliente */}
        <div className="px-4 py-3 border-b border-border">
          <p className="text-xs font-semibold text-ink-2 uppercase tracking-wider mb-1.5">Cliente</p>
          <button onClick={() => setShowClienteModal(true)}
            className="w-full flex items-center gap-2 text-sm text-ink-2 hover:text-ink transition-colors">
            <User className="w-3.5 h-3.5 flex-shrink-0" />
            {clienteSeleccionado
              ? <span className="font-medium text-ink truncate">{clienteSeleccionado.nombre}</span>
              : <span className="text-ink-2">Consumidor final <span className="text-ink-2/50">F2</span></span>
            }
            {clienteSeleccionado && (
              <span onClick={e => { e.stopPropagation(); setCliente(null) }}
                className="ml-auto text-ink-2 hover:text-ink">
                <X className="w-3 h-3" />
              </span>
            )}
          </button>
        </div>

        {/* Resumen de items */}
        <div className="flex-1 overflow-y-auto px-4 py-3">
          {carrito.length === 0 ? (
            <p className="text-xs text-ink-2 text-center py-8">Sin productos</p>
          ) : (
            <div className="space-y-2">
              {carrito.map(item => {
                const itemTotal = item.precio_unitario * item.cantidad * (1 - item.descuento / 100)
                return (
                  <div key={item.producto_id} className="flex items-center justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-ink truncate">{item.nombre}</p>
                      <p className="text-xs text-ink-2">{item.cantidad} × {COP(item.precio_unitario)}</p>
                    </div>
                    <p className="text-xs font-semibold text-ink flex-shrink-0">{COP(itemTotal)}</p>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Método de pago */}
        <div className="border-t border-border">
          <MetodoPago />
        </div>

        {/* Totales */}
        <div className="px-4 py-3 border-t border-border space-y-1.5">
          <div className="flex justify-between text-xs text-ink-2">
            <span>Subtotal</span><span>{COP(subtotal)}</span>
          </div>
          <div className="flex justify-between text-xs text-ink-2">
            <span>IVA</span><span>{COP(iva)}</span>
          </div>
          <div className="flex justify-between text-sm font-bold text-ink border-t border-border pt-2 mt-1">
            <span>Total</span><span>{COP(total)}</span>
          </div>
        </div>

        {/* Botón cobrar */}
        <div className="px-4 pb-4">
          <button
            onClick={() => carrito.length > 0 && setShowCobroModal(true)}
            disabled={carrito.length === 0}
            onKeyDown={e => { if (e.key === 'Enter' && !ventaMutation.isPending) setShowCobroModal(true) }}
            className="w-full py-3.5 rounded-xl font-bold text-sm transition-colors disabled:opacity-30 text-white bg-accent hover:bg-accent/90"
          >
            Cobrar
            {carrito.length > 0 && <span className="ml-2">{COP(total)}</span>}
            <span className="ml-2 opacity-40 font-normal text-xs">F3</span>
          </button>
        </div>
      </div>

      {/* ── Modal: cliente ── */}
      <Modal isOpen={showClienteModal} onClose={() => setShowClienteModal(false)} title="Seleccionar cliente">
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-2" />
            <input autoFocus type="text" value={clienteSearch} onChange={e => setClienteSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-colors"
              placeholder="Buscar por nombre o documento..." />
          </div>
          <button onClick={() => { setCliente(null); setShowClienteModal(false) }}
            className="w-full py-2.5 border border-dashed border-border rounded-lg text-sm text-ink-2 hover:border-border-strong hover:text-ink transition-colors">
            Consumidor final
          </button>
          <div className="max-h-60 overflow-y-auto divide-y divide-border">
            {clientesData?.clientes?.map(c => (
              <button key={c.id} onClick={() => { setCliente(c); setShowClienteModal(false) }}
                className="w-full text-left px-3 py-2.5 hover:bg-surface-soft transition-colors">
                <p className="text-sm font-medium text-ink">{c.nombre}</p>
                <p className="text-xs text-ink-2">{c.tipo_documento}: {c.numero_documento}</p>
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
            <p className="text-xs text-ink-2 uppercase tracking-wider mb-1">Total</p>
            <p className="text-4xl font-bold text-ink tracking-tight">{COP(total)}</p>
            {clienteSeleccionado && <p className="text-xs text-ink-2 mt-1">{clienteSeleccionado.nombre}</p>}
          </div>

          <MetodoPago />

          {metodoPago === 'efectivo' && (
            <div className="space-y-2">
              <label className="text-xs font-semibold text-ink-2 uppercase tracking-wider">Efectivo recibido</label>
              <input autoFocus type="number" value={efectivoRecibido} onChange={e => setEfectivoRecibido(e.target.value)}
                className="w-full px-4 py-3 border border-border rounded-lg text-2xl font-bold text-center focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-colors"
                placeholder="0" />
              {efectivoNum >= total && efectivoNum > 0 && (
                <div className="flex justify-between text-sm font-semibold bg-surface-soft rounded-lg px-4 py-2.5">
                  <span className="text-ink-2">Vuelto</span>
                  <span className="text-ink">{COP(vuelto)}</span>
                </div>
              )}
              {efectivoInsuficiente && <p className="text-xs text-danger text-center">Monto insuficiente</p>}
            </div>
          )}

          {errorVenta && (
            <div className="flex items-start gap-2 bg-red-50 text-danger text-xs p-3 rounded-lg border border-red-200">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />{errorVenta}
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <button onClick={() => { setShowCobroModal(false); setErrorVenta('') }}
              className="flex-1 py-2.5 border border-border rounded-lg text-sm font-medium text-ink hover:bg-surface-soft transition-colors">
              Cancelar
            </button>
            <button onClick={handleCobrar} disabled={ventaMutation.isPending || efectivoInsuficiente}
              className="flex-1 bg-accent text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-accent/90 disabled:opacity-40 flex items-center justify-center gap-2 transition-colors">
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

            {/* Opciones secundarias */}
            <div className="flex gap-2 pt-2">
              {/* Reimprimir ticket térmico */}
              {qzTray.conectado && qzTray.impTermica && (
                <button
                  onClick={async () => {
                    try {
                      const cmds = buildTicket({ empresa: tenant || {}, venta: ventaResult, cliente: clienteSeleccionado, cajero: user?.nombre || '', modoDemo: ventaResult?.estado === 'demo', W: parseInt(localStorage.getItem('carolina_printer_ancho') === '58' ? 32 : 48), densidad: qzTray.densidad, avancePapel: qzTray.avancePapel, modoCortePapel: qzTray.modoCortePapel, abrirGaveta: false })
                      await qzTray.imprimirTicket(cmds)
                    } catch {}
                  }}
                  className="flex-1 py-2 text-xs border border-border rounded-lg text-ink-2 hover:bg-surface-soft transition-colors"
                >
                  Reimprimir ticket
                </button>
              )}
              {/* Factura A4 */}
              <button
                onClick={() => setVistaTicket(vistaTicket === 'a4' ? 'ticket' : 'a4')}
                className="flex-1 py-2 text-xs border border-border rounded-lg text-ink-2 hover:bg-surface-soft transition-colors"
              >
                {vistaTicket === 'a4' ? 'Ocultar factura' : 'Ver factura A4'}
              </button>
            </div>

            {/* Factura A4 expandible */}
            {vistaTicket === 'a4' && (
              <div className="border-t border-border pt-4">
                <FacturaA4 venta={ventaResult} tenant={tenant} cliente={clienteSeleccionado} />
              </div>
            )}

            {/* Nueva venta */}
            <button
              onClick={() => { setShowTicketModal(false); setVistaTicket('ticket') }}
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
