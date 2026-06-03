import React, { createContext, useContext, useEffect } from 'react'
import { useAuthStore } from '../store/authStore'
import { authService } from '../services/auth'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const { user, tenant, isAuthenticated, setAuth, logout, updateTenant } = useAuthStore()

  const loginFn = async (email, password) => {
    const data = await authService.login(email, password)
    setAuth(data.token, data.refresh_token, data.user, data.tenant)
    return data
  }

  const registerFn = async (empresa, admin) => {
    const data = await authService.register(empresa, admin)
    setAuth(data.token, data.refresh_token, data.user, data.tenant)
    return data
  }

  const logoutFn = async () => {
    try { await authService.logout() } catch {}
    logout()
  }

  return (
    <AuthContext.Provider value={{ user, tenant, isAuthenticated, login: loginFn, register: registerFn, logout: logoutFn, updateTenant }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider')
  return ctx
}
