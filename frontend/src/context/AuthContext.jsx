import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react'
import { useAuthStore } from '../store/authStore'
import { authService } from '../services/auth'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const { user, tenant, isAuthenticated, setAuth, logout, updateTenant, updateUser } = useAuthStore()
  const [splashing, setSplashing] = useState(true)
  const splashTimer = useRef(null)

  // Carga inicial: mostrar splash ~1 s (cubre JWT check y post-logout)
  useEffect(() => {
    splashTimer.current = setTimeout(() => setSplashing(false), 1000)
    return () => clearTimeout(splashTimer.current)
  }, [])

  const triggerSplash = useCallback((ms = 700) => {
    clearTimeout(splashTimer.current)
    setSplashing(true)
    splashTimer.current = setTimeout(() => setSplashing(false), ms)
  }, [])

  const loginFn = async (loginInput, password) => {
    const data = await authService.login(loginInput, password)
    setAuth(data.token, data.refresh_token, data.user, data.tenant)
    triggerSplash(800)
    return data
  }

  const registerFn = async (empresa, admin) => {
    const data = await authService.register(empresa, admin)
    setAuth(data.token, data.refresh_token, data.user, data.tenant)
    triggerSplash(800)
    return data
  }

  const logoutFn = async () => {
    try { await authService.logout() } catch {}
    logout()
    // Recarga completa para limpiar estado en memoria
    // El splash de carga inicial cubre la transición en el próximo mount
    window.location.href = '/login'
  }

  return (
    <AuthContext.Provider value={{
      user, tenant, isAuthenticated,
      login: loginFn, register: registerFn, logout: logoutFn,
      updateTenant, updateUser,
      splashing, triggerSplash,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth debe usarse dentro de AuthProvider')
  return ctx
}
