'use client'

import React, { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { ExternalLink } from 'lucide-react'

const SidebarAdWrapper = ({ children }: { children: React.ReactNode }) => (
  <div className="mt-4 bg-white rounded-xl border border-gray-100 p-5 flex flex-col transition-all hover:border-orange-100 relative shadow-[0_4px_20px_-10px_rgba(0,0,0,0.05)]">
    {children}
    <div className="absolute top-4 right-4 text-[7px] text-gray-300 uppercase tracking-widest font-black opacity-30">Sponsored</div>
  </div>
)

const AdPlaceholder = () => (
  <div className="text-[10px] font-medium text-gray-200 uppercase tracking-widest py-2 text-center w-full opacity-50 group-hover:opacity-100 transition-opacity">
    Promotion Slot
  </div>
)

export const SidebarAdEchoCloud = () => {
  const [ad, setAd] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchRandomAd() {
      const { data, error } = await supabase.rpc('get_random_ad', { p_placement: 'sidebar' })
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

  if (loading) return <SidebarAdWrapper><div className="animate-pulse h-20 w-full bg-gray-50/50 rounded-lg" /></SidebarAdWrapper>

  return (
    <SidebarAdWrapper>
      {!ad ? (
        <AdPlaceholder />
      ) : (
        <div className="flex flex-col w-full group">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-6 h-6 rounded-full bg-orange-50 border border-orange-100 flex-shrink-0 flex items-center justify-center text-orange-600 font-bold text-[10px] shadow-sm">
              {ad.title.charAt(0).toUpperCase()}
            </div>
            <div className="flex flex-col min-w-0">
               <span className="text-[11px] font-bold text-gray-900 truncate leading-tight tracking-tight">{ad.title}</span>
               <span className="text-[9px] text-gray-400 font-normal">Promoted Partner</span>
            </div>
          </div>

          <div className="space-y-3">
            <p className="text-[12px] text-gray-600 leading-normal font-normal line-clamp-3">
              {ad.description}
            </p>

            {ad.image_url && (
              <a 
                href={ad.external_link}
                target="_blank"
                rel="noopener noreferrer"
                onClick={handleTrackClick}
                className="block w-full h-28 bg-gray-50 overflow-hidden rounded-lg border border-gray-100 flex items-start cursor-pointer hover:opacity-95 transition-opacity"
              >
                 <img src={ad.image_url} alt={ad.title} className="w-full h-full object-cover" />
              </a>
            )}
            
            <a 
              href={ad.external_link} 
              target="_blank"
              rel="noopener noreferrer"
              onClick={handleTrackClick}
              className="inline-flex items-center gap-1.5 text-[11px] font-bold text-orange-600 hover:text-orange-700 transition-colors border-b border-transparent hover:border-orange-200"
            >
              {ad.cta_text || 'Learn More'}
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      )}
    </SidebarAdWrapper>
  )
}
