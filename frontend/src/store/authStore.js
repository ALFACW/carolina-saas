import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      tenant: null,
      token: null,
      isAuthenticated: false,

      setAuth: (token, refreshToken, user, tenant) => {
        localStorage.setItem('carolina_token', token)
        localStorage.setItem('carolina_refresh_token', refreshToken)
        set({ user, tenant, token, isAuthenticated: true })
      },

      updateTenant: (tenant) => set({ tenant }),

      logout: () => {
        localStorage.removeItem('carolina_token')
        localStorage.removeItem('carolina_refresh_token')
        set({ user: null, tenant: null, token: null, isAuthenticated: false })
      },
    }),
    {
      name: 'carolina-auth',
      partialize: (state) => ({ user: state.user, tenant: state.tenant, isAuthenticated: state.isAuthenticated }),
    }
  )
)
