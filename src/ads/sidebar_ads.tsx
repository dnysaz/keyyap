'use client'

import React from 'react'

const BlankAdWrapper = ({ children }: { children: React.ReactNode }) => (
  <div className="mt-4 bg-gray-50/50 rounded-2xl border-2 border-dashed border-gray-200 p-6 flex flex-col items-center justify-center text-center group hover:border-primary/50 transition-all hover:bg-white">
    {children}
  </div>
)

const AdContent = () => (
  <>
    <div className="bg-gray-100 text-gray-400 text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider mb-2">
      Ad Space Available
    </div>
    <h3 className="font-bold text-gray-400 text-sm mb-1 uppercase tracking-tight">Your Ad Here</h3>
    <p className="text-[11px] text-gray-400 mb-4 leading-tight">
      Advertise on KeyYap to reach our curated community of thinkers.
    </p>
    <a 
      href="mailto:contact@keyyap.com" 
      className="text-xs font-bold text-primary hover:underline flex items-center gap-1"
    >
      Contact us: contact@keyyap.com
    </a>
  </>
)

export const SidebarAdEchoCloud = () => (
  <BlankAdWrapper>
    <AdContent />
  </BlankAdWrapper>
)

export const SidebarAdKeyYapPremium = () => (
  <BlankAdWrapper>
    <AdContent />
  </BlankAdWrapper>
)
