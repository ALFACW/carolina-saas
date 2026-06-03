import api from './api'

export const comprasService = {
  async getAll(params = {}) { const { data } = await api.get('/api/compras', { params }); return data },
  async getById(id) { const { data } = await api.get(`/api/compras/${id}`); return data },
  async create(c) { const { data } = await api.post('/api/compras', c); return data },
  async update(id, c) { const { data } = await api.put(`/api/compras/${id}`, c); return data },
  async recibir(id) { const { data } = await api.post(`/api/compras/${id}/recibir`); return data },
  async cancelar(id) { const { data } = await api.delete(`/api/compras/${id}`); return data },
}
