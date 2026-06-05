import React from 'react'

export default function Input({ label, type = 'text', placeholder, value, onChange, icon, className = '', ...props }) {
  return (
    <div className="flex flex-col gap-1.5">
      {label && <label className="text-sm font-medium text-ink">{label}</label>}
      <div className="relative">
        {icon && <span className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-2">{icon}</span>}
        <input
          type={type}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          className={`w-full px-3 py-2.5 border border-border rounded-lg text-sm text-ink bg-white
            focus:outline-none focus:ring-2 focus:ring-accent-line focus:border-accent
            transition-colors placeholder:text-ink-2/60 ${icon ? 'pl-9' : ''} ${className}`}
          {...props}
        />
      </div>
    </div>
  )
}
