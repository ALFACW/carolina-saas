import api from './api'

export const cajasService = {
  async getCajas() {
    const { data } = await api.get('/api/cajas')
    return data
  },
  async createCaja(c) {
    const { data } = await api.post('/api/cajas', c)
    return data
  },
  async updateCaja(id, c) {
    const { data } = await api.put(`/api/cajas/${id}`, c)
    return data
  },
  async getSesionActiva() {
    const { data } = await api.get('/api/sesiones/activa')
    return data
  },
  async getSesiones(params) {
    const { data } = await api.get('/api/sesiones', { params })
    return data
  },
  async getSesion(id) {
    const { data } = await api.get(`/api/sesiones/${id}`)
    return data
  },
  async abrirSesion(datos) {
    const { data } = await api.post('/api/sesiones/abrir', datos)
    return data
  },
  async cerrarSesion(id, datos) {
    const { data } = await api.post(`/api/sesiones/${id}/cerrar`, datos)
    return data
  },
  async aprobarSesion(id) {
    const { data } = await api.post(`/api/sesiones/${id}/aprobar`)
    return data
  },
  async getUltimaSesion(cajaId) {
    const params = cajaId ? { caja_id: cajaId } : {}
    const { data } = await api.get('/api/sesiones/ultima', { params })
    return data
  },
}
