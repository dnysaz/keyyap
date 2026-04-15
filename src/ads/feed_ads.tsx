'use client'

import React from 'react'

// Layout Wrapper for In-Feed Ads to ensure consistency
const InFeedAdWrapper = ({ children }: { children: React.ReactNode }) => (
  <div className="p-10 border-b border-gray-100 bg-gray-50/30 flex flex-col items-center justify-center text-center group transition-all hover:bg-gray-50">
    <div className="border-2 border-dashed border-gray-200 rounded-[32px] p-8 w-full max-w-lg group-hover:border-primary/40 transition-colors">
      {children}
    </div>
  </div>
)

const AdContent = () => (
  <div className="flex flex-col items-center">
    <div className="bg-gray-200 text-gray-500 text-[10px] px-2 py-0.5 rounded font-black uppercase tracking-widest mb-4">
      Advertisement Space
    </div>
    <h3 className="text-xl font-bold text-gray-400 mb-2">Available for your Brand</h3>
    <p className="text-sm text-gray-400 mb-6 max-w-sm">
      Connect with our focused audience through native in-feed placement.
    </p>
    <a 
      href="mailto:contact@keyyap.com" 
      className="bg-primary/10 text-primary px-6 py-2.5 rounded-full font-bold text-sm hover:bg-primary hover:text-white transition-all shadow-sm"
    >
      Contact us: contact@keyyap.com
    </a>
  </div>
)

export const FeedAd01 = () => (
  <InFeedAdWrapper>
    <AdContent />
  </InFeedAdWrapper>
)

export const FeedAd02 = () => (
  <InFeedAdWrapper>
    <AdContent />
  </InFeedAdWrapper>
)
