import React from 'react'
import { useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { PanelLeftClose, PanelLeftOpen, Bell, LogOut } from 'lucide-react'

const TITLES = {
  '/dashboard':    'Dashboard',
  '/pos':          'Punto de Venta',
  '/facturas':     'Facturación',
  '/productos':    'Inventario',
  '/clientes':     'Clientes',
  '/proveedores':  'Proveedores',
  '/compras':      'Compras',
  '/cartera':      'Cartera',
  '/reportes':     'Reportes',
  '/configuracion':'Configuración',
  '/usuarios':     'Usuarios',
  '/cajas':        'Caja y Sesiones',
  '/mi-perfil':    'Mi Perfil',
  '/guia-hardware':'Guía Hardware',
}

export function Header({ onToggleSidebar, sidebarAbierto }) {
  const { pathname } = useLocation()
  const { user, tenant, logout } = useAuth()
  const title = TITLES[pathname] ?? TITLES[Object.keys(TITLES).find(k => pathname.startsWith(k))] ?? 'Carolina'

  return (
    <header className="bg-white border-b border-border px-6 py-3 flex items-center gap-4">
      {/* Toggle sidebar */}
      <button
        onClick={onToggleSidebar}
        className="p-1.5 text-ink-2 hover:text-ink hover:bg-surface-soft rounded-lg transition-colors flex-shrink-0"
        title={sidebarAbierto ? 'Ocultar menú' : 'Mostrar menú'}
      >
        {sidebarAbierto
          ? <PanelLeftClose className="w-5 h-5" />
          : <PanelLeftOpen  className="w-5 h-5" />
        }
      </button>

      <h1 className="text-sm font-semibold text-ink flex-1">{title}</h1>

      <div className="flex items-center gap-3">
        {tenant?.plan && (
          <span className="text-xs uppercase tracking-widest font-semibold text-ink-2 hidden md:block">
            Plan {tenant.plan}
          </span>
        )}

        <span className="text-border hidden md:block">|</span>

        <span className="text-xs text-ink-2 font-medium hidden md:block">
          {new Date().toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' })}
          {' · '}
          {new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
        </span>

        <button className="text-ink-2 hover:text-ink transition-colors p-1.5 rounded-lg hover:bg-surface-soft">
          <Bell size={18} />
        </button>

        <span className="text-sm font-medium text-ink hidden md:block">{user?.nombre}</span>
      </div>
    </header>
  )
}
