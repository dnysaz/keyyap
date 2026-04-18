'use client'

import React, { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { ExternalLink } from 'lucide-react'

const SidebarAdWrapper = ({ children, bgColor = '#ffffff' }: { children: React.ReactNode, bgColor?: string }) => (
  <div 
    className="mt-4 rounded-xl border border-gray-100 p-5 flex flex-col transition-all hover:border-orange-100 relative shadow-[0_4px_20px_-10px_rgba(0,0,0,0.05)]"
    style={{ backgroundColor: bgColor }}
  >
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
    <SidebarAdWrapper bgColor={ad ? (ad.bg_color || '#ffffff') : '#ffffff'}>
      {!ad ? (
        <AdPlaceholder />
      ) : (
        <div className="flex flex-col w-full group">
          <div className="flex items-center gap-2 mb-3">
            {ad.brand_logo_url ? (
               <img src={ad.brand_logo_url} alt="Brand Logo" className="w-6 h-6 rounded-full object-cover flex-shrink-0 shadow-sm" />
            ) : (
               <div className="w-6 h-6 rounded-full bg-orange-50 border border-orange-100 flex-shrink-0 flex items-center justify-center text-orange-600 font-bold text-[10px] shadow-sm">
                 {ad.title.charAt(0).toUpperCase()}
               </div>
            )}
            <div className="flex flex-col min-w-0">
               <span className="text-[11px] font-bold text-gray-900 truncate leading-tight tracking-tight">{ad.title}</span>
               <span className="text-[9px] text-gray-400 font-normal">Promoted Partner</span>
            </div>
          </div>

          <div className="flex flex-col w-full">
            {ad.image_position === 'left' ? (
              <div className="flex gap-3 mb-3">
                {ad.image_url && (
                  <a 
                    href={ad.external_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={handleTrackClick}
                    className="block w-20 h-20 flex-shrink-0 bg-white overflow-hidden rounded-lg border border-gray-100 flex items-center justify-center cursor-pointer hover:opacity-95 transition-opacity"
                  >
                     <img src={ad.image_url} alt={ad.title} className="w-full h-full object-contain" />
                  </a>
                )}
                <p className="text-[11px] text-gray-600 leading-relaxed font-normal line-clamp-4">
                  {ad.description}
                </p>
              </div>
            ) : (
              <>
                <p className="text-[12px] text-gray-600 leading-normal font-normal line-clamp-3 mb-3">
                  {ad.description}
                </p>
                {ad.image_url && (
                  <a 
                    href={ad.external_link}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={handleTrackClick}
                    className="block w-full h-28 mb-3 bg-white overflow-hidden rounded-lg border border-gray-100 flex items-center justify-center cursor-pointer hover:opacity-95 transition-opacity shadow-[0_2px_8px_-4px_rgba(0,0,0,0.1)]"
                  >
                     <img src={ad.image_url} alt={ad.title} className="w-full h-auto max-h-28 object-contain" />
                  </a>
                )}
              </>
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
