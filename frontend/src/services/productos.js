import api from './api'

export const productosService = {
  async getAll(params = {}) {
    const { data } = await api.get('/api/productos', { params })
    return data
  },
  async getById(id) {
    const { data } = await api.get(`/api/productos/${id}`)
    return data
  },
  async create(producto) {
    const { data } = await api.post('/api/productos', producto)
    return data
  },
  async update(id, producto) {
    const { data } = await api.put(`/api/productos/${id}`, producto)
    return data
  },
  async remove(id) {
    const { data } = await api.delete(`/api/productos/${id}`)
    return data
  },
  async ajusteStock(id, ajuste) {
    const { data } = await api.post(`/api/productos/${id}/ajuste-stock`, ajuste)
    return data
  },
}
