import React, { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar'
import { Header } from './Header'

export function Layout() {
  const [sidebarAbierto, setSidebarAbierto] = useState(true)

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar con animación */}
      <div className={`flex-shrink-0 transition-all duration-300 ${sidebarAbierto ? 'w-56' : 'w-0 overflow-hidden'}`}>
        <Sidebar />
      </div>

      <div className="flex-1 flex flex-col min-w-0">
        <Header onToggleSidebar={() => setSidebarAbierto(v => !v)} sidebarAbierto={sidebarAbierto} />
        <main className="flex-1 p-8 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
