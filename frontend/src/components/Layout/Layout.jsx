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
    <div className="flex min-h-screen bg-gray-50">
      <div className={`flex-shrink-0 transition-all duration-300 ${sidebarAbierto ? 'w-56' : 'w-0 overflow-hidden'}`}>
        <Sidebar />
      </div>
      <div className="flex-1 flex flex-col min-w-0">
        {!esPOS && <Header onToggleSidebar={toggleSidebar} sidebarAbierto={sidebarAbierto} />}
        <main className={`flex-1 overflow-auto ${esPOS ? '' : 'p-8'}`}>
          <Outlet />
        </main>
      </div>
    </div>
  )
}
