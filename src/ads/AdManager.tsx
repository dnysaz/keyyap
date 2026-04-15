'use client'

import React, { useMemo } from 'react'
import { FeedAd01, FeedAd02 } from './feed_ads'
import { SidebarAdEchoCloud, SidebarAdKeyYapPremium } from './sidebar_ads'

/**
 * Returns a random Feed Ad component
 */
export const RandomFeedAd = () => {
  const ads = [FeedAd01, FeedAd02]
  // In a real app, we might use a hash or index to keep it stable per render
  // For now, let's just pick one.
  const AdComponent = useMemo(() => ads[Math.floor(Math.random() * ads.length)], [])
  return <AdComponent />
}

/**
 * Returns a random Sidebar Ad component
 */
export const RandomSidebarAd = () => {
  const ads = [SidebarAdEchoCloud, SidebarAdKeyYapPremium]
  const AdComponent = useMemo(() => ads[Math.floor(Math.random() * ads.length)], [])
  return <AdComponent />
}
