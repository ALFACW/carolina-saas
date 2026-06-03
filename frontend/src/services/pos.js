import api from './api'

export const posService = {
  async getDashboard() {
    const { data } = await api.get('/api/pos/dashboard')
    return data
  },
  async procesarVenta(venta) {
    const { data } = await api.post('/api/pos/venta', venta)
    return data
  },
  async getProductosRapido() {
    const { data } = await api.get('/api/pos/productos-rapido')
    return data
  },
}
