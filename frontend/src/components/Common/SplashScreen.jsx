import React from 'react'

export default function SplashScreen() {
  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-surface">
      <div className="flex flex-col items-center gap-8">
        {/* Logo con animación pop */}
        <div className="animate-splash-pop">
          <img
            src="/brand/logo-lockup.svg"
            alt="CarolinaPOS"
            width={220}
            height={49}
            draggable={false}
            style={{ userSelect: 'none' }}
          />
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
