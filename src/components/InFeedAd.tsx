'use client'

import React from 'react'
import { ExternalLink } from 'lucide-react'

export default function InFeedAd() {
  return (
    <div className="px-4 py-8 md:py-10 border-b border-gray-100 hover:bg-gray-50/50 transition-all cursor-pointer group">
      <div className="flex gap-3">
        {/* Ad Icon Placeholder */}
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-orange-400 flex items-center justify-center shrink-0 shadow-sm">
          <span className="text-white font-black text-xs">A</span>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              <span className="font-bold text-gray-900">KeyYap Premium</span>
              <span className="bg-gray-100 text-gray-500 text-[10px] px-1.5 py-0.5 rounded font-bold uppercase">Ad</span>
            </div>
          </div>

          <p className="mt-1 text-gray-800 leading-normal">
            Enjoy an ad-free experience and support the community. Unlock exclusive themes and badges!
          </p>

          <div className="mt-3 rounded-2xl overflow-hidden border border-gray-100 bg-white">
            <div className="h-40 bg-gradient-to-r from-orange-500 via-primary to-orange-600 flex flex-col items-center justify-center p-6 text-center text-white">
              <h4 className="text-2xl font-black tracking-tight mb-2">UPGRADE TO PRO</h4>
              <p className="text-sm opacity-90 max-w-xs">Get more space, more reach, and more control over your words.</p>
              <button className="mt-4 px-6 py-2 bg-white text-primary font-bold rounded-full text-sm hover:scale-105 transition-transform shadow-lg">
                Start 7-Day Free Trial
              </button>
            </div>
            <div className="p-3 flex items-center justify-between text-xs text-gray-500">
              <span className="flex items-center gap-1 font-medium"><ExternalLink className="w-3 h-3" /> keyyap.com/premium</span>
              <span className="uppercase font-bold text-gray-400">Sponsored</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
