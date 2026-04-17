'use client'

import React, { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { ExternalLink } from 'lucide-react'

const InFeedAdWrapper = ({ children }: { children: React.ReactNode }) => (
  <div className="p-0 border-b border-gray-100 bg-white flex flex-col items-center transition-all duration-300 hover:border-orange-200 hover:bg-orange-50/5 group/ad">
    <div className="py-10 md:py-14 px-5 md:px-6 w-full max-w-2xl relative">
      {children}
      <div className="absolute top-8 right-6 text-[7px] text-gray-300 uppercase tracking-widest font-black opacity-40 group-hover/ad:text-orange-400 group-hover/ad:opacity-100 transition-all">Sponsored</div>
    </div>
  </div>
)

const FeedAdPlaceholder = () => (
  <div className="flex flex-col items-center text-[10px] uppercase tracking-widest font-medium text-gray-100 py-4 opacity-0 group-hover:opacity-100 transition-opacity">
    Promotion Entry
  </div>
)

const DynamicFeedAd = () => {
  const [ad, setAd] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchRandomAd() {
      const { data, error } = await supabase.rpc('get_random_ad', { p_placement: 'feed' })
      if (data && data.length > 0) {
        const selectedAd = data[0]
        setAd(selectedAd)
        supabase.rpc('increment_ad_stats', { ad_id: selectedAd.id, stat_type: 'view' }).then(() => {})
      }
      setLoading(false)
    }
    fetchRandomAd()
  }, [])

  const handleTrackClick = async () => {
    if (ad) await supabase.rpc('increment_ad_stats', { ad_id: ad.id, stat_type: 'click' })
  }

  if (loading) return <InFeedAdWrapper><div className="animate-pulse h-32 w-full bg-gray-50/50 rounded-lg" /></InFeedAdWrapper>

  return (
    <InFeedAdWrapper>
      {!ad ? (
        <FeedAdPlaceholder />
      ) : (
        <div className="flex items-start gap-4 w-full group">
          <div className="w-10 h-10 rounded-full bg-orange-50 border border-orange-100 flex-shrink-0 flex items-center justify-center text-orange-600 font-bold text-xs shadow-sm group-hover:scale-105 transition-transform">
            {ad.title.charAt(0).toUpperCase()}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex flex-col mb-2">
               <span className="text-[14px] font-bold text-gray-900 tracking-tight leading-tight">{ad.title}</span>
               <span className="text-[10px] text-gray-400 font-normal uppercase tracking-widest group-hover:text-orange-400 transition-colors">Promoted Content</span>
            </div>

            <p className="text-[14px] text-gray-600 leading-relaxed font-normal mb-5 whitespace-pre-wrap">
              {ad.description}
            </p>

            {ad.image_url && (
              <a 
                href={ad.external_link}
                target="_blank"
                rel="noopener noreferrer"
                onClick={handleTrackClick}
                className="block mb-6 rounded-xl overflow-hidden border border-gray-100 bg-gray-50 flex items-start cursor-pointer hover:opacity-95 transition-opacity shadow-sm group-hover:border-orange-100"
              >
                 <img src={ad.image_url} alt={ad.title} className="w-full h-auto max-h-[450px] object-cover" />
              </a>
            )}

            <a 
              href={ad.external_link}
              target="_blank"
              rel="noopener noreferrer"
              onClick={handleTrackClick}
              className="inline-flex items-center gap-2 px-6 py-2.5 border border-gray-100 rounded-full text-[12px] font-bold text-orange-600 hover:bg-orange-600 hover:text-white transition-all cursor-pointer shadow-sm active:scale-95"
            >
              {ad.cta_text || 'Learn More'}
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      )}
    </InFeedAdWrapper>
  )
}

export const FeedAd01 = () => <DynamicFeedAd />
export const FeedAd02 = () => <DynamicFeedAd />
