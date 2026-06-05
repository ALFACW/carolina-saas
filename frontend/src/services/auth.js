import api from './api'

export const authService = {
  async login(loginInput, password) {
    const { data } = await api.post('/api/auth/login', { login: loginInput, password })
    return data
  },
  async register(empresa, admin) {
    const { data } = await api.post('/api/auth/register', { empresa, admin })
    return data
  },
  async me() {
    const { data } = await api.get('/api/auth/me')
    return data
  },
  async logout() {
    await api.post('/api/auth/logout')
    localStorage.removeItem('carolina_token')
    localStorage.removeItem('carolina_refresh_token')
  },
}
