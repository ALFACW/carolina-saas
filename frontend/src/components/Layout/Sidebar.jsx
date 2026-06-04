import React from 'react'
import { NavLink, useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

const NAV_POR_ROL = {
  admin:      ['/dashboard', '/pos', '/facturas', '/productos', '/clientes', '/proveedores', '/compras', '/cartera', '/reportes', '/cajas', '/usuarios', '/configuracion'],
  supervisor: ['/dashboard', '/pos', '/facturas', '/clientes', '/proveedores', '/compras', '/cartera', '/reportes', '/cajas'],
  cajero:     ['/caja/abrir', '/pos'],
  vendedor:   ['/caja/abrir', '/pos'],
  inventario: ['/productos', '/clientes'],
}

const TODOS_NAV = [
  { to: '/dashboard',     label: 'Dashboard' },
  { to: '/pos',           label: 'Punto de Venta' },
  { to: '/caja/abrir',    label: 'Mi Caja' },
  { to: '/facturas',      label: 'Facturas' },
  { to: '/productos',     label: 'Productos' },
  { to: '/clientes',      label: 'Clientes' },
  { to: '/proveedores',   label: 'Proveedores' },
  { to: '/compras',       label: 'Compras' },
  { to: '/cartera',       label: 'Cartera' },
  { to: '/reportes',      label: 'Reportes' },
  { to: '/cajas',         label: 'Cajas y Turnos' },
  { to: '/usuarios',      label: 'Usuarios' },
  { to: '/configuracion', label: 'Configuración' },
]

export function Sidebar() {
  const { user, tenant, logout } = useAuth()
  const logo = localStorage.getItem('carolina_logo') || null
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  const navPermitido = NAV_POR_ROL[user?.rol] || []
  const navFiltrado = TODOS_NAV.filter(n => navPermitido.includes(n.to))

  return (
    <aside className="w-56 bg-white border-r border-gray-100 min-h-screen flex flex-col">
      {/* Marca */}
      <div className="px-6 py-5 border-b border-gray-100">
        <p className="text-base font-bold text-gray-900 tracking-tight">Carolina</p>
        <p className="text-xs text-gray-400 mt-0.5">Facturación DIAN</p>
      </div>

      {/* Empresa activa */}
      {tenant && (
        <div className="px-4 py-3 border-b border-gray-100">
          {/* Logo si existe */}
          {logo && (
            <div className="mb-2">
              <img src={logo} alt="Logo" className="h-10 w-auto object-contain mx-auto" />
            </div>
          )}
          <p className="text-xs font-semibold text-gray-800 truncate">{tenant.nombre}</p>
          <p className="text-xs text-gray-400 capitalize mt-0.5">Plan {tenant.plan}</p>
        </div>
      )}

      {/* Navegación filtrada por rol */}
      <nav className="flex-1 py-3 px-3 space-y-0.5">
        {navFiltrado.map(({ to, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `block px-3 py-2 rounded-md text-sm transition-colors ${
                isActive
                  ? 'bg-gray-900 text-white font-medium'
                  : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
              }`
            }
          >
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Usuario */}
      <div className="px-5 py-4 border-t border-gray-100">
        <Link to="/mi-perfil" className="block group mb-1">
          <p className="text-xs font-semibold text-gray-800 truncate group-hover:text-gray-900">{user?.nombre}</p>
          <p className="text-xs text-gray-400 capitalize mt-0.5 group-hover:text-gray-500">
            {user?.rol} · <span className="underline">Mi perfil</span>
          </p>
        </Link>
        <button
          onClick={handleLogout}
          className="text-xs text-gray-400 hover:text-gray-700 transition-colors mt-2"
        >
          Cerrar sesión
        </button>
      </div>
    </aside>
  )
}
