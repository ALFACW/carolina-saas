import React from 'react'
import { useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react'

const TITLES = {
  '/dashboard':    'Dashboard',
  '/pos':          'Punto de Venta',
  '/facturas':     'Facturas',
  '/productos':    'Productos',
  '/clientes':     'Clientes',
  '/reportes':     'Reportes',
  '/configuracion':'Configuración',
  '/usuarios':     'Usuarios',
  '/cajas':        'Cajas y Turnos',
}

export function Header({ onToggleSidebar, sidebarAbierto }) {
  const { pathname } = useLocation()
  const { tenant } = useAuth()
  const title = TITLES[pathname] ?? TITLES[Object.keys(TITLES).find(k => pathname.startsWith(k))] ?? 'Carolina'

  return (
    <header className="bg-white border-b border-gray-100 px-6 py-4 flex items-center gap-4">
      {/* Botón toggle sidebar */}
      <button
        onClick={onToggleSidebar}
        className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-md transition-colors flex-shrink-0"
        title={sidebarAbierto ? 'Ocultar menú' : 'Mostrar menú'}
      >
        {sidebarAbierto
          ? <PanelLeftClose className="w-5 h-5" />
          : <PanelLeftOpen  className="w-5 h-5" />
        }
      </button>

      <h1 className="text-sm font-semibold text-gray-900 flex-1">{title}</h1>

      <div className="flex items-center gap-4 text-xs">
        {tenant?.plan && (
          <span className="uppercase tracking-widest font-bold text-gray-500">
            Plan {tenant.plan}
          </span>
        )}
        <span className="text-gray-200">|</span>
        <span className="font-bold text-gray-600">
          {new Date().toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' })}
          {' · '}
          {new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
    </header>
  )
}
