import React from 'react'

export default function SplashScreen() {
  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-surface">
      <div className="flex flex-col items-center gap-8">
        {/* Logo con animación pop */}
        <div className="animate-splash-pop flex items-center gap-3 select-none">
          <span className="w-12 h-12 rounded-full bg-accent flex items-center justify-center font-brand font-bold text-2xl text-white flex-shrink-0">
            C
          </span>
          <span className="font-brand font-semibold text-2xl text-ink flex items-center">
            Carolina
            <span className="bg-accent text-white font-bold text-sm px-2.5 py-1 rounded-lg ml-2">POS</span>
          </span>
        </div>

        {/* Dots de carga */}
        <div className="flex gap-2">
          {[0, 1, 2].map(i => (
            <span
              key={i}
              className="inline-block w-2 h-2 rounded-full bg-accent animate-splash-dot"
              style={{ animationDelay: `${i * 200}ms` }}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
