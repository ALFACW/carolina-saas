import React from 'react'

export const Input = React.forwardRef(function Input({ label, error, hint, className = '', ...props }, ref) {
  return (
    <div className="space-y-1.5">
      {label && (
        <label className="block text-sm font-medium text-ink">
          {label}
        </label>
      )}
      <input
        ref={ref}
        className={`w-full px-3 py-2.5 border text-sm rounded-lg bg-white transition-colors focus:outline-none focus:ring-2 focus:ring-accent-line focus:border-accent placeholder:text-ink-2/60 ${
          error ? 'border-danger bg-red-50' : 'border-border hover:border-border-strong'
        } ${className}`}
        {...props}
      />
      {error && <p className="text-xs text-danger">{error}</p>}
      {hint && !error && <p className="text-xs text-ink-2">{hint}</p>}
    </div>
  )
})
