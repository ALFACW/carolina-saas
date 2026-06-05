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
      <div className="flex flex-col items-center gap-4">
        <Loader2 className="w-12 h-12 animate-spin text-accent" />
        <p className="text-ink font-semibold font-brand">Carolina POS</p>
      </div>
    </div>
  )
}
