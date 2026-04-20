'use client'

import { useState, useEffect } from 'react'

export default function BetaBanner() {
  const [dismissed, setDismissed] = useState(true) // Start hidden to avoid flash

  useEffect(() => {
    const wasDismissed = localStorage.getItem('beta_banner_dismissed')
    if (!wasDismissed) {
      setDismissed(false)
    }
  }, [])

  const handleDismiss = () => {
    setDismissed(true)
    localStorage.setItem('beta_banner_dismissed', '1')
  }

  if (dismissed) return null

  return (
    <div className="bg-gray-50 border-b border-gray-100">
      <div className="lg:ml-[72px] xl:ml-[260px] flex justify-center">
        <div className="w-full max-w-[1050px] flex items-start">
          <div className="flex-1 max-w-2xl">
            <div className="flex items-center justify-between px-4 py-2.5 gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="shrink-0 w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                <p className="text-[12px] text-gray-500 leading-snug min-w-0">
                  <span className="font-bold text-gray-700">Public Beta</span>
                  <span className="mx-1.5 text-gray-300">·</span>
                  <span>You may encounter occasional bugs while we improve things.</span>
                </p>
              </div>
              <button 
                onClick={handleDismiss}
                className="shrink-0 text-[11px] font-bold text-gray-400 hover:text-gray-600 transition-colors px-2 py-1 rounded-lg hover:bg-gray-100"
              >
                Got it
              </button>
            </div>
          </div>
          <div className="hidden lg:block w-[350px] shrink-0" />
        </div>
      </div>
    </div>
  )
}
