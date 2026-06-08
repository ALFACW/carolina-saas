import React from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Home, ArrowLeft } from 'lucide-react'

export default function NotFound() {
  const navigate = useNavigate()

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-surface-soft p-6">
      <div className="text-center max-w-sm">
        {/* Número grande decorativo */}
        <div className="font-brand font-bold text-[96px] leading-none text-accent/10 select-none mb-2">
          404
        </div>

        {/* Logo pequeño */}
        <div className="flex items-center justify-center gap-2 mb-6">
          <span className="w-7 h-7 rounded-full bg-accent flex items-center justify-center font-brand font-bold text-sm text-white">C</span>
          <span className="font-brand font-semibold text-base text-ink">
            Carolina<span className="bg-accent text-white text-xs font-bold px-1.5 py-0.5 rounded ml-1">POS</span>
          </span>
        </div>

        <h1 className="text-2xl font-bold text-ink mb-2">Página no encontrada</h1>
        <p className="text-sm text-ink-2 mb-8 leading-relaxed">
          La dirección que buscas no existe o fue movida.
        </p>

        <div className="flex items-center justify-center gap-3">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 px-4 py-2 border border-border rounded-lg text-sm font-medium text-ink-2 hover:bg-surface"
          >
            <ArrowLeft size={15} />
            Volver
          </button>
          <Link
            to="/dashboard"
            className="inline-flex items-center gap-2 px-4 py-2 bg-accent text-white rounded-lg text-sm font-semibold"
          >
            <Home size={15} />
            Inicio
          </Link>
        </div>
      </div>
    </div>
  )
}
