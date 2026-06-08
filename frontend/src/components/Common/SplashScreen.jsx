import React from 'react'

export default function SplashScreen() {
  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-surface">
      <div className="flex flex-col items-center gap-10">

        {/* Logo */}
        <div className="animate-splash-pop flex items-center gap-3 select-none">
          {/* Badge */}
          <span
            className="w-11 h-11 rounded-full bg-accent flex-shrink-0 flex items-center justify-center font-brand font-bold text-white"
            style={{ fontSize: '1.25rem', lineHeight: 1 }}
          >
            C
          </span>
          {/* Wordmark */}
          <span className="font-brand font-semibold text-[1.375rem] leading-none text-ink flex items-center">
            Carolina
            <span className="bg-accent text-white font-bold text-xs px-2 py-[3px] rounded-md ml-2 leading-normal">
              POS
            </span>
          </span>
        </div>

        {/* Dots */}
        <div className="flex gap-[7px]">
          {[0, 1, 2].map(i => (
            <span
              key={i}
              className="inline-block w-[7px] h-[7px] rounded-full bg-accent/60 animate-splash-dot"
              style={{ animationDelay: `${i * 180}ms` }}
            />
          ))}
        </div>

      </div>
    </div>
  )
}
