import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { Layout } from './components/Layout/Layout'
import { RoleGuard } from './components/Auth/RoleGuard'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import POS from './pages/POS'
import Productos from './pages/Productos'
import ProductoForm from './pages/ProductoForm'
import Facturas from './pages/Facturas'
import FacturaDetalle from './pages/FacturaDetalle'
import Clientes from './pages/Clientes'
import ClienteForm from './pages/ClienteForm'
import Reportes from './pages/Reportes'
import Configuracion from './pages/Configuracion'
import Usuarios from './pages/Usuarios'
import MiPerfil from './pages/MiPerfil'
import Cajas from './pages/Cajas'
import AbrirCaja from './pages/AbrirCaja'
import CerrarCaja from './pages/CerrarCaja'
import SesionDetalle from './pages/SesionDetalle'
import SuperAdminLogin from './pages/SuperAdminLogin'
import SuperAdmin from './pages/SuperAdmin'
import Proveedores from './pages/Proveedores'
import Compras from './pages/Compras'
import CompraForm from './pages/CompraForm'
import CompraDetalle from './pages/CompraDetalle'
import Cartera from './pages/Cartera'

function PrivateRoute({ children }) {
  const { isAuthenticated } = useAuth()
  if (!isAuthenticated) return <Navigate to="/login" replace />
  return children
}

function PublicRoute({ children }) {
  const { isAuthenticated } = useAuth()
  if (isAuthenticated) return <Navigate to="/dashboard" replace />
  return children
}

function AppRoutes() {
  return (
    <Routes>
      {/* Rutas públicas */}
      <Route path="/login" element={<PublicRoute><Login /></PublicRoute>} />
      <Route path="/register" element={<PublicRoute><Register /></PublicRoute>} />

      {/* Super Admin (sin Layout normal) */}
      <Route path="/super-admin/login" element={<SuperAdminLogin />} />
      <Route path="/super-admin" element={<SuperAdmin />} />

      {/* Rutas de caja: pantalla completa, sin Layout */}
      <Route path="/caja/abrir" element={<PrivateRoute><AbrirCaja /></PrivateRoute>} />
      <Route path="/caja/cerrar/:sesionId" element={<PrivateRoute><CerrarCaja /></PrivateRoute>} />

      {/* Rutas protegidas con Layout */}
      <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<RoleGuard roles={['admin', 'supervisor']}><Dashboard /></RoleGuard>} />
        <Route path="pos" element={<RoleGuard roles={['admin', 'supervisor', 'cajero', 'vendedor']}><POS /></RoleGuard>} />
        <Route path="facturas" element={<RoleGuard roles={['admin', 'supervisor']}><Facturas /></RoleGuard>} />
        <Route path="facturas/:id" element={<RoleGuard roles={['admin', 'supervisor']}><FacturaDetalle /></RoleGuard>} />
        <Route path="productos" element={<RoleGuard roles={['admin', 'inventario']}><Productos /></RoleGuard>} />
        <Route path="productos/nuevo" element={<RoleGuard roles={['admin', 'inventario']}><ProductoForm /></RoleGuard>} />
        <Route path="productos/:id/editar" element={<RoleGuard roles={['admin', 'inventario']}><ProductoForm /></RoleGuard>} />
        <Route path="clientes" element={<RoleGuard roles={['admin', 'supervisor', 'inventario']}><Clientes /></RoleGuard>} />
        <Route path="clientes/nuevo" element={<RoleGuard roles={['admin', 'supervisor', 'inventario']}><ClienteForm /></RoleGuard>} />
        <Route path="clientes/:id/editar" element={<RoleGuard roles={['admin', 'supervisor', 'inventario']}><ClienteForm /></RoleGuard>} />
        <Route path="reportes" element={<RoleGuard roles={['admin', 'supervisor']}><Reportes /></RoleGuard>} />
        <Route path="configuracion" element={<RoleGuard roles={['admin']}><Configuracion /></RoleGuard>} />
        <Route path="mi-perfil" element={<MiPerfil />} />
        <Route path="usuarios" element={<RoleGuard roles={['admin']}><Usuarios /></RoleGuard>} />
        <Route path="cajas" element={<RoleGuard roles={['admin', 'supervisor']}><Cajas /></RoleGuard>} />
        <Route path="sesiones/:id" element={<RoleGuard roles={['admin', 'supervisor']}><SesionDetalle /></RoleGuard>} />
        <Route path="proveedores" element={<RoleGuard roles={['admin', 'supervisor']}><Proveedores /></RoleGuard>} />
        <Route path="compras" element={<RoleGuard roles={['admin', 'supervisor']}><Compras /></RoleGuard>} />
        <Route path="compras/nueva" element={<RoleGuard roles={['admin', 'supervisor']}><CompraForm /></RoleGuard>} />
        <Route path="compras/:id/editar" element={<RoleGuard roles={['admin', 'supervisor']}><CompraForm /></RoleGuard>} />
        <Route path="compras/:id" element={<RoleGuard roles={['admin', 'supervisor']}><CompraDetalle /></RoleGuard>} />
        <Route path="cartera" element={<RoleGuard roles={['admin', 'supervisor']}><Cartera /></RoleGuard>} />
      </Route>

      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </BrowserRouter>
  )
}
