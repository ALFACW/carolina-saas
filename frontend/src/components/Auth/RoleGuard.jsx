import React from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

// Ruta home por rol
const HOME_POR_ROL = {
  admin:      '/dashboard',
  supervisor: '/dashboard',
  cajero:     '/caja/abrir',
  vendedor:   '/caja/abrir',
  inventario: '/productos',
}

export function RoleGuard({ roles, children }) {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  if (roles && !roles.includes(user.rol)) {
    const home = HOME_POR_ROL[user.rol] || '/pos'
    return <Navigate to={home} replace />
  }
  return children
}
