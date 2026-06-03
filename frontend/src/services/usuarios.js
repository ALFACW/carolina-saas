import api from './api'

export const usuariosService = {
  async getAll() {
    const { data } = await api.get('/api/usuarios')
    return data
  },
  async create(u) {
    const { data } = await api.post('/api/usuarios', u)
    return data
  },
  async update(id, u) {
    const { data } = await api.put(`/api/usuarios/${id}`, u)
    return data
  },
  async remove(id) {
    const { data } = await api.delete(`/api/usuarios/${id}`)
    return data
  },
  async resetPassword(id, password) {
    const { data } = await api.put(`/api/usuarios/${id}/reset-password`, { password })
    return data
  },
}
