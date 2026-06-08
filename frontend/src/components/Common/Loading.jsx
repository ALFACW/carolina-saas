import React from 'react'
import { Loader2 } from 'lucide-react'

export function Loading({ text = 'Cargando...' }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[200px] gap-3 text-ink-2">
      <Loader2 className="w-8 h-8 animate-spin text-accent" />
      <span className="text-sm">{text}</span>
    </div>
  )
}

export function FullPageLoading() {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-white z-50">
      <div className="flex flex-col items-center gap-6">
        <div className="flex items-center gap-3 select-none">
          <span className="w-10 h-10 rounded-full bg-accent flex items-center justify-center font-brand font-bold text-xl text-white flex-shrink-0">C</span>
          <span className="font-brand font-semibold text-xl text-ink flex items-center">
            Carolina<span className="bg-accent text-white font-bold text-xs px-2 py-0.5 rounded-md ml-1.5">POS</span>
          </span>
        </div>
        <Loader2 className="w-7 h-7 animate-spin text-accent" />
      </div>
    </div>
  )
}
