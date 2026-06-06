import React, { useState, useEffect } from 'react'
import { NavLink, useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import {
  Home, ShoppingCart, FileText, Package, Users, Wallet, Clock,
  BarChart3, Settings, LogOut, Truck, ShoppingBag, ClipboardList,
} from 'lucide-react'

const NAV_POR_ROL = {
  admin:      ['/dashboard', '/pos', '/facturas', '/productos', '/clientes', '/proveedores', '/compras', '/cartera', '/reportes', '/cajas', '/cierres', '/usuarios', '/configuracion'],
  supervisor: ['/dashboard', '/pos', '/facturas', '/clientes', '/proveedores', '/compras', '/cartera', '/reportes', '/cajas', '/cierres'],
  cajero:     ['/caja/abrir', '/pos'],
  vendedor:   ['/caja/abrir', '/pos'],
  inventario: ['/productos', '/clientes'],
}

const MENU_GROUPS = [
  {
    group: 'Ventas',
    items: [
      { icon: Home,         label: 'Dashboard',       path: '/dashboard' },
      { icon: ShoppingCart, label: 'Punto de Venta',  path: '/pos' },
      { icon: FileText,     label: 'Facturación',     path: '/facturas' },
    ]
  },
  {
    group: 'Gestión',
    items: [
      { icon: Package,      label: 'Inventario',   path: '/productos' },
      { icon: Users,        label: 'Clientes',     path: '/clientes' },
      { icon: Truck,        label: 'Proveedores',  path: '/proveedores' },
      { icon: ShoppingBag,  label: 'Compras',      path: '/compras' },
    ]
  },
  {
    group: 'Finanzas',
    items: [
      { icon: Wallet,    label: 'Cartera',         path: '/cartera' },
      { icon: Clock,         label: 'Caja y Sesiones', path: '/cajas' },
      { icon: ClipboardList, label: 'Cierres de caja', path: '/cierres' },
      { icon: BarChart3,     label: 'Reportes',        path: '/reportes' },
    ]
  },
  {
    group: 'Admin',
    items: [
      { icon: Settings, label: 'Configuración', path: '/configuracion' },
      { icon: Users,    label: 'Usuarios',      path: '/usuarios' },
    ]
  },
]

const EXTRA_NAV = [
  { to: '/caja/abrir', label: 'Mi Caja', icon: Clock },
]

export function Sidebar({ colapsado = false }) {
  const { user, tenant, logout } = useAuth()
  const navigate = useNavigate()
  const [fotoPerfil, setFotoPerfil] = useState(() => localStorage.getItem('carolina_foto_perfil') || null)

  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === 'carolina_foto_perfil') setFotoPerfil(e.newValue)
    }
    window.addEventListener('storage', onStorage)
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

  const filteredGroups = MENU_GROUPS.map(group => ({
    ...group,
    items: group.items.filter(item => navPermitido.includes(item.path)),
  })).filter(group => group.items.length > 0)

  const extraItems = EXTRA_NAV.filter(n => navPermitido.includes(n.to))

  const AvatarCircle = () => (
    <div className="w-8 h-8 rounded-full overflow-hidden flex-shrink-0 border border-border">
      {fotoPerfil ? (
        <img src={fotoPerfil} alt="Foto de perfil" className="w-full h-full object-cover" />
      ) : (
        <div className="w-full h-full bg-accent flex items-center justify-center">
          <span className="text-white text-xs font-bold">{iniciales}</span>
        </div>
      )}
    </div>
  )

  /* ── SIDEBAR COLAPSADO (solo iconos) ── */
  if (colapsado) {
    return (
      <aside className="w-14 bg-white border-r border-border h-screen flex flex-col">

        {/* Logo compacto — solo la C */}
        <div className="flex items-center justify-center border-b border-border h-[72px]">
          <span className="w-9 h-9 rounded-full bg-accent flex items-center justify-center font-brand font-bold text-lg text-white select-none">
            C
          </span>
        </div>

        {/* Nav — solo iconos con tooltip nativo */}
        <nav className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] py-3 px-2 space-y-1">
          {extraItems.length > 0 && (
            <>
              {extraItems.map(({ to, label, icon: Icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  title={label}
                  className={({ isActive }) =>
                    `flex items-center justify-center p-2.5 rounded-lg transition-colors ${
                      isActive ? 'bg-accent-soft text-accent' : 'text-ink-2 hover:bg-surface-soft hover:text-ink'
                    }`
                  }
                >
                  <Icon size={18} />
                </NavLink>
              ))}
              <div className="h-px bg-border mx-1 my-1" />
            </>
          )}

          {filteredGroups.map((group, gi) => (
            <React.Fragment key={group.group}>
              {gi > 0 && <div className="h-px bg-border mx-1 my-1" />}
              {group.items.map((item) => {
                const Icon = item.icon
                return (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    title={item.label}
                    className={({ isActive }) =>
                      `flex items-center justify-center p-2.5 rounded-lg transition-colors ${
                        isActive ? 'bg-accent-soft text-accent' : 'text-ink-2 hover:bg-surface-soft hover:text-ink'
                      }`
                    }
                  >
                    <Icon size={18} />
                  </NavLink>
                )
              })}
            </React.Fragment>
          ))}
        </nav>

        {/* Footer compacto */}
        <div className="p-2 border-t border-border flex flex-col items-center gap-1">
          <Link
            to="/mi-perfil"
            title="Mi perfil"
            className="p-1.5 rounded-lg hover:bg-surface-soft transition-colors"
          >
            <AvatarCircle />
          </Link>
          <button
            onClick={handleLogout}
            title="Cerrar sesión"
            className="flex items-center justify-center p-2 w-full rounded-lg text-danger hover:bg-red-50 transition-colors"
          >
            <LogOut size={18} />
          </button>
        </div>
      </aside>
    )
  }

  /* ── SIDEBAR EXPANDIDO (completo) ── */
  return (
    <aside className="w-60 bg-white border-r border-border h-screen flex flex-col">

      {/* Logo CarolinaPOS + tenant */}
      <div className="p-6 border-b border-border">
        <div className="flex items-center gap-2">
          <span className="w-9 h-9 rounded-full bg-accent flex items-center justify-center font-brand font-bold text-lg text-white flex-shrink-0">
            C
          </span>
          <span className="font-brand font-semibold text-base text-ink flex items-center">
            Carolina
            <span className="bg-accent text-white font-bold text-xs px-2 py-0.5 rounded-md ml-1.5">POS</span>
          </span>
        </div>
        {tenant && (
          <div className="mt-3">
            <p className="text-xs font-semibold text-ink truncate">{tenant.nombre}</p>
            <p className="text-xs text-ink-2 mt-0.5">
              Plan {({ basico: 'Básico', profesional: 'Profesional', empresarial: 'Empresarial', starter: 'Básico' })[tenant.plan] ?? tenant.plan}
            </p>
          </div>
        )}
      </div>

      {/* Navegación por grupos */}
      <nav className="flex-1 overflow-y-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] px-4 py-6 space-y-6">
        {extraItems.length > 0 && (
          <ul className="space-y-1">
            {extraItems.map(({ to, label }) => (
              <li key={to}>
                <NavLink
                  to={to}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      isActive ? 'bg-accent-soft text-accent' : 'text-ink-2 hover:bg-surface-soft hover:text-ink'
                    }`
                  }
                >
                  {label}
                </NavLink>
              </li>
            ))}
          </ul>
        )}

        {filteredGroups.map((group) => (
          <div key={group.group}>
            <h3 className="text-xs font-semibold text-ink-2 uppercase tracking-wider px-2 mb-3">
              {group.group}
            </h3>
            <ul className="space-y-1">
              {group.items.map((item) => {
                const Icon = item.icon
                return (
                  <li key={item.path}>
                    <NavLink
                      to={item.path}
                      className={({ isActive }) =>
                        `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                          isActive ? 'bg-accent-soft text-accent' : 'text-ink-2 hover:bg-surface-soft hover:text-ink'
                        }`
                      }
                    >
                      <Icon size={18} />
                      {item.label}
                    </NavLink>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Usuario + logout */}
      <div className="p-4 border-t border-border space-y-1">
        <Link to="/mi-perfil" className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-surface-soft transition-colors">
          <AvatarCircle />
          <div className="min-w-0">
            <p className="text-xs font-semibold text-ink truncate">{user?.nombre}</p>
            <p className="text-xs text-ink-2 capitalize mt-0.5">
              {user?.rol} · <span className="underline">Mi perfil</span>
            </p>
          </div>
        </Link>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-danger hover:bg-red-50 transition-colors focus:ring-2 focus:ring-accent/30 focus:outline-none"
        >
          <LogOut size={18} />
          Cerrar sesión
        </button>
      </div>
    </aside>
  )
}
