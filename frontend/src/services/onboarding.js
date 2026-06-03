import api from './api'

export const onboardingService = {
  async getEstado() {
    const { data } = await api.get('/api/onboarding/estado')
    return data
  },
  async validarAlegra(alegra_user, alegra_token) {
    const { data } = await api.post('/api/onboarding/alegra/validar', { alegra_user, alegra_token })
    return data
  },
  async desconectarAlegra() {
    const { data } = await api.post('/api/onboarding/alegra/desconectar')
    return data
  },
}
