import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:3000',
  timeout: 15000,
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('carolina_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Limpia TODO el estado de auth y redirige al login
function clearAuthAndRedirect() {
  localStorage.removeItem('carolina_token')
  localStorage.removeItem('carolina_refresh_token')
  localStorage.removeItem('carolina-auth') // Zustand persist
  window.location.href = '/login'
}

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true
      const refreshToken = localStorage.getItem('carolina_refresh_token')
      if (refreshToken) {
        try {
          const { data } = await axios.post(
            `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/auth/refresh`,
            { refresh_token: refreshToken }
          )
          localStorage.setItem('carolina_token', data.token)
          localStorage.setItem('carolina_refresh_token', data.refresh_token)
          original.headers.Authorization = `Bearer ${data.token}`
          return api(original)
        } catch {
          clearAuthAndRedirect()
        }
      } else {
        clearAuthAndRedirect()
      }
    }
    return Promise.reject(error)
  }
)

export default api
