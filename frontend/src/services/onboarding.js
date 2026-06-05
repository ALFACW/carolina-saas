import api from './api'

export const onboardingService = {
  async getEstado() {
    const { data } = await api.get('/api/onboarding/estado')
    return data
  },
}
