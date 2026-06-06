import React from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Header } from './Header'
import { useUIStore } from '../../store/uiStore'

export function Layout() {
  const { sidebarAbierto, toggleSidebar } = useUIStore()
  const { pathname } = useLocation()
  const esPOS = pathname === '/pos'

  return (
    <div className="flex min-h-screen bg-surface-soft">
      {/* Overlay para móvil cuando el sidebar está abierto */}
      {sidebarAbierto && (
        <div
          className="fixed inset-0 bg-black/40 z-40 md:hidden"
          onClick={toggleSidebar}
        />
      )}

      {/* Sidebar: fixed en móvil, relativo en desktop.
          En desktop: w-60 expandido | w-14 colapsado (nunca desaparece del todo) */}
      <div className={`
        fixed inset-y-0 left-0 z-50 transition-all duration-200
        md:relative md:translate-x-0 md:z-auto md:flex-shrink-0
        ${sidebarAbierto
          ? 'translate-x-0 md:w-60'
          : '-translate-x-full md:translate-x-0 md:w-14'
        }
      `}>
        <Sidebar colapsado={!sidebarAbierto} />
      </div>

      <div className="flex-1 flex flex-col min-w-0">
        {!esPOS && <Header onToggleSidebar={toggleSidebar} sidebarAbierto={sidebarAbierto} />}
        <main className={`flex-1 overflow-auto ${esPOS ? '' : 'p-4 md:p-8'}`}>
          <Outlet />
        </main>
      </div>
    </div>
  )
}
