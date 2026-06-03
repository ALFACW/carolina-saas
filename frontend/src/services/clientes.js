import api from './api'

export const clientesService = {
  async getAll(params = {}) {
    const { data } = await api.get('/api/clientes', { params })
    return data
  },
  async getById(id) {
    const { data } = await api.get(`/api/clientes/${id}`)
    return data
  },
  async create(cliente) {
    const { data } = await api.post('/api/clientes', cliente)
    return data
  },
  async update(id, cliente) {
    const { data } = await api.put(`/api/clientes/${id}`, cliente)
    return data
  },
  async remove(id) {
    const { data } = await api.delete(`/api/clientes/${id}`)
    return data
  },
}
