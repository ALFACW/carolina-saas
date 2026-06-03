import api from './api'

// El super admin usa el mismo interceptor axios pero con header propio
function saHeaders() {
  const token = localStorage.getItem('carolina_sa_token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

export const superAdminService = {
  async login(email, password) {
    const { data } = await api.post('/api/super-admin/login', { email, password })
    return data
  },

  async getTenants(params) {
    const { data } = await api.get('/api/super-admin/tenants', {
      headers: saHeaders(),
      params,
    })
    return data
  },

  async getEstadisticas() {
    const { data } = await api.get('/api/super-admin/estadisticas', {
      headers: saHeaders(),
    })
    return data
  },

  async updateTenant(id, updates) {
    const { data } = await api.put(`/api/super-admin/tenants/${id}`, updates, {
      headers: saHeaders(),
    })
    return data
  },
}
