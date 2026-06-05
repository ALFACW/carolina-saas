import React from 'react'
import { Loader2 } from 'lucide-react'

export function Button({ children, loading, variant = 'primary', size = 'md', className = '', ...props }) {
  const base = 'inline-flex items-center justify-center gap-2 font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed rounded-lg'
  const variants = {
    primary:   'bg-accent text-white hover:bg-accent/90',
    secondary: 'bg-white text-ink border border-border hover:bg-surface-soft',
    danger:    'bg-danger text-white hover:bg-danger/90',
    ghost:     'text-ink-2 hover:text-ink hover:bg-surface-soft',
  }
  const sizes = {
    sm: 'px-3 py-1.5 text-xs',
    md: 'px-4 py-2.5 text-sm',
    lg: 'px-5 py-3 text-sm',
  }
  return (
    <button className={`${base} ${variants[variant]} ${sizes[size]} ${className}`} disabled={loading || props.disabled} {...props}>
      {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
      {children}
    </button>
  )
}
