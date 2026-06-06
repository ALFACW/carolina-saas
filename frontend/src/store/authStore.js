import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useAuthStore = create(
  persist(
    (set) => ({
      user: null,
      tenant: null,
      token: null,
      isAuthenticated: false,

      setAuth: (token, refreshToken, user, tenant) => {
        localStorage.setItem('carolina_token', token)
        localStorage.setItem('carolina_refresh_token', refreshToken)
        if (tenant?.logo) localStorage.setItem('carolina_logo', tenant.logo)
        else localStorage.removeItem('carolina_logo')
        set({ user, tenant, token, isAuthenticated: true })
      },

      updateTenant: (tenant) => set((s) => ({ tenant: { ...s.tenant, ...tenant } })),
      updateUser: (user) => set((s) => ({ user: { ...s.user, ...user } })),

      logout: () => {
        // Limpiar TODO — tokens + estado + persist
        localStorage.removeItem('carolina_token')
        localStorage.removeItem('carolina_refresh_token')
        localStorage.removeItem('carolina-auth') // limpiar el persist de Zustand
        set({ user: null, tenant: null, token: null, isAuthenticated: false })
      },
    }),
    {
      name: 'carolina-auth',
      partialize: (state) => ({
        user:            state.user,
        tenant:          state.tenant,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
)
