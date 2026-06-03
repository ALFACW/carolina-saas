import api from './api'

export const facturasService = {
  async getAll(params = {}) {
    const { data } = await api.get('/api/facturas', { params })
    return data
  },
  async getById(id) {
    const { data } = await api.get(`/api/facturas/${id}`)
    return data
  },
  async getPDF(id) {
    const { data } = await api.get(`/api/facturas/${id}/pdf`)
    return data
  },
  async anular(id) {
    const { data } = await api.post(`/api/facturas/${id}/anular`)
    return data
  },
}
