import React, { useState, useEffect } from 'react'
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
  const [fotoPerfil, setFotoPerfil] = useState(() => localStorage.getItem('carolina_foto_perfil') || null)

  // Actualizar foto cuando cambie en localStorage (navegación entre páginas)
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === 'carolina_foto_perfil') {
        setFotoPerfil(e.newValue)
      }
    }
    window.addEventListener('storage', onStorage)
    // Polling liviano para cambios dentro de la misma pestaña
    const interval = setInterval(() => {
      const stored = localStorage.getItem('carolina_foto_perfil')
      setFotoPerfil(prev => prev !== stored ? stored : prev)
    }, 1000)
    return () => {
      window.removeEventListener('storage', onStorage)
      clearInterval(interval)
    }
  }, [])

  const iniciales = user?.nombre
    ? user.nombre.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase()
    : 'U'

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
        <Link to="/mi-perfil" className="flex items-center gap-2.5 group mb-1">
          {/* Avatar circular */}
          <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 border border-gray-200 group-hover:border-gray-400 transition-colors">
            {fotoPerfil ? (
              <img src={fotoPerfil} alt="Foto de perfil" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-gray-900 flex items-center justify-center">
                <span className="text-white text-xs font-bold">{iniciales}</span>
              </div>
            )}
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-gray-800 truncate group-hover:text-gray-900">{user?.nombre}</p>
            <p className="text-xs text-gray-400 capitalize mt-0.5 group-hover:text-gray-500">
              {user?.rol} · <span className="underline">Mi perfil</span>
            </p>
          </div>
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
