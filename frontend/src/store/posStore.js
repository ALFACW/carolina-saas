import { create } from 'zustand'

export const usePOSStore = create((set, get) => ({
  carrito: [],
  clienteSeleccionado: null,
  metodoPago: 'efectivo',

  agregarItem: (producto) => {
    const { carrito } = get()
    const existente = carrito.find(i => i.producto_id === producto.id)
    if (existente) {
      // No superar el stock disponible
      if (existente.cantidad >= existente.stock_actual) return
      set({ carrito: carrito.map(i => i.producto_id === producto.id ? { ...i, cantidad: i.cantidad + 1 } : i) })
    } else {
      set({ carrito: [...carrito, {
        producto_id: producto.id,
        nombre: producto.nombre,
        codigo: producto.codigo || '',
        precio_unitario: parseFloat(producto.precio_venta),
        cantidad: 1,
        descuento: 0,
        iva: parseFloat(producto.impuesto_iva) || 0,
        stock_actual: producto.stock_actual,
      }] })
    }
  },

  actualizarCantidad: (producto_id, cantidad) => {
    if (cantidad <= 0) {
      set({ carrito: get().carrito.filter(i => i.producto_id !== producto_id) })
    } else {
      set({ carrito: get().carrito.map(i => i.producto_id === producto_id ? { ...i, cantidad } : i) })
    }
  },

  removerItem: (producto_id) => set({ carrito: get().carrito.filter(i => i.producto_id !== producto_id) }),

  actualizarDescuento: (producto_id, descuento) => set({
    carrito: get().carrito.map(i => i.producto_id === producto_id ? { ...i, descuento } : i),
  }),

  limpiarCarrito: () => set({ carrito: [], clienteSeleccionado: null, metodoPago: 'efectivo' }),

  setCliente: (cliente) => set({ clienteSeleccionado: cliente }),

  setMetodoPago: (metodo) => set({ metodoPago: metodo }),

  getSubtotal: () => get().carrito.reduce((s, i) => s + (i.precio_unitario * i.cantidad * (1 - i.descuento / 100)), 0),
  getIVA: () => get().carrito.reduce((s, i) => s + (i.precio_unitario * i.cantidad * (1 - i.descuento / 100) * i.iva / 100), 0),
  getTotal: () => {
    const sub = get().getSubtotal()
    const iva = get().getIVA()
    return sub + iva
  },
}))
