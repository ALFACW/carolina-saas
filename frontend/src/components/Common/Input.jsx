import React from 'react'

export const Input = React.forwardRef(function Input({ label, error, hint, className = '', ...props }, ref) {
  return (
    <div className="space-y-1">
      {label && (
        <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wide">
          {label}
        </label>
      )}
      <input
        ref={ref}
        className={`w-full px-3 py-2 border text-sm rounded-md bg-white transition-colors focus:outline-none focus:ring-1 focus:ring-gray-900 focus:border-gray-900 ${
          error ? 'border-red-400 bg-red-50' : 'border-gray-200 hover:border-gray-300'
        } ${className}`}
        {...props}
      />
      {error && <p className="text-xs text-red-500">{error}</p>}
      {hint && !error && <p className="text-xs text-gray-400">{hint}</p>}
    </div>
  )
})
