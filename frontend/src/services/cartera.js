import api from './api'

export const carteraService = {
  async getResumen(params = {}) {
    const { data } = await api.get('/api/cartera', { params })
    return data
  },
  async getByCliente(clienteId) {
    const { data } = await api.get(`/api/cartera/cliente/${clienteId}`)
    return data
  },
  async registrarPago(pago) {
    const { data } = await api.post('/api/cartera/pago', pago)
    return data
  },
  async getPagos(facturaId) {
    const { data } = await api.get(`/api/cartera/pagos/${facturaId}`)
    return data
  },
}
