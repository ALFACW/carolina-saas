import api from './api'

export const proveedoresService = {
  async getAll(params = {}) { const { data } = await api.get('/api/proveedores', { params }); return data },
  async getById(id) { const { data } = await api.get(`/api/proveedores/${id}`); return data },
  async create(p) { const { data } = await api.post('/api/proveedores', p); return data },
  async update(id, p) { const { data } = await api.put(`/api/proveedores/${id}`, p); return data },
  async remove(id) { const { data } = await api.delete(`/api/proveedores/${id}`); return data },
}
