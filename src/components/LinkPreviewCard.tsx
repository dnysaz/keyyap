'use client'

import React, { useState, useEffect } from 'react'
import { Link as LinkIcon, Play, ExternalLink } from 'lucide-react'

interface LinkPreviewData {
  title: string
  description: string
  image: string
  url: string
}

function extractYoutubeId(url: string): string | null {
  const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([^?&\s/]+)/)
  return match ? match[1] : null
}

function extractTiktokId(url: string): string | null {
  const match = url.match(/tiktok\.com\/.*\/video\/(\d+)/)
  return match ? match[1] : null
}

function extractInstagramId(url: string): string | null {
  const match = url.match(/instagram\.com\/(?:p|reels|reel)\/([A-Za-z0-9_-]+)/)
  return match ? match[1] : null
}

function extractSpotifyId(url: string) {
  const match = url.match(/https?:\/\/open\.spotify\.com\/(track|album|playlist)\/([a-zA-Z0-9]+)/)
  if (!match) return null
  return { type: match[1], id: match[2] }
}

const InstagramIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2003/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
  </svg>
)

export default function LinkPreviewCard({ url }: { url: string }) {
  const [data, setData] = useState<LinkPreviewData | null>(null)
  const [loading, setLoading] = useState(true)
  const [expandedVideo, setExpandedVideo] = useState<string | null>(null)

  const youtubeId = extractYoutubeId(url)
  const tiktokId = extractTiktokId(url)
  const igId = extractInstagramId(url)
  const spotify = extractSpotifyId(url)

  useEffect(() => {
    // Skip fetching if it's a rich media we render custom frames for
    if (youtubeId || tiktokId || igId || spotify) {
       setLoading(false);
       return;
    }

    async function fetchPreview() {
      try {
        const res = await fetch(`/api/link-preview?url=${encodeURIComponent(url)}`)
        if (res.ok) {
          const json = await res.ok ? await res.json() : null
          if (json && !json.error) setData(json)
        }
      } catch (err) {
        console.error('Link Preview Error:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchPreview()
  }, [url])

  if (loading) return (
    <div className="flex gap-4 p-4 rounded-2xl border border-gray-100 animate-pulse bg-gray-50/50">
      <div className="w-24 md:w-32 aspect-video bg-gray-100 rounded-lg shrink-0" />
      <div className="flex-1 space-y-2 py-2">
        <div className="h-4 bg-gray-100 rounded w-3/4" />
        <div className="h-3 bg-gray-100 rounded w-full" />
      </div>
    </div>
  )

  // RICH MEDIA HANDLERS
  if (youtubeId) {
    return (
      <div className="rounded-2xl overflow-hidden border border-gray-100 group-hover/video:border-gray-300 bg-black aspect-video relative group/video my-4 transition-colors">
        {expandedVideo === youtubeId ? (
          <iframe src={`https://www.youtube.com/embed/${youtubeId}?autoplay=1`} className="w-full h-full border-0" allow="autoplay; encrypted-media; fullscreen" />
        ) : (
          <div className="w-full h-full cursor-pointer relative" onClick={() => setExpandedVideo(youtubeId)}>
            <img src={`https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`} className="w-full h-full object-cover opacity-80" alt="Play Video" />
            <div className="absolute inset-0 flex items-center justify-center bg-black/10 hover:bg-black/20 transition-colors">
              <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center text-white shadow-2xl group-hover/video:scale-110 transition-transform">
                <Play className="w-8 h-8 fill-current translate-x-1" />
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  if (tiktokId) {
    return (
      <div className="rounded-2xl overflow-hidden border border-gray-100 hover:border-gray-300 bg-white w-full flex items-stretch h-[340px] my-4 transition-colors">
        <div className="w-[190px] shrink-0 bg-black relative overflow-hidden">
          <div className="absolute inset-0 flex items-start justify-start" style={{ width: '325px', height: '580px', transform: 'scale(0.585)', transformOrigin: 'top left' }}>
            <iframe src={`https://www.tiktok.com/embed/v2/${tiktokId}`} className="w-full h-full border-0" allow="autoplay; encrypted-media" loading="lazy" scrolling="no" />
          </div>
        </div>
        <div className="p-5 flex-1 min-w-0 flex flex-col justify-center bg-gray-50/20">
          <div className="flex items-center gap-2 mb-3">
             <div className="w-6 h-6 rounded-full bg-black flex items-center justify-center">
               <svg className="w-3.5 h-3.5 text-white fill-current" viewBox="0 0 24 24"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.06-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-1.22-.32-2.57-.3-3.73.3-.54.28-1.03.68-1.39 1.16-.49.63-.69 1.41-.74 2.2-.08 1.5.39 3.03 1.48 4.07 1.08 1.05 2.61 1.49 4.09 1.34 1.28-.15 2.41-.89 3.06-2.02.37-.63.53-1.35.54-2.08v-14.1z"/></svg>
             </div>
             <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">TikTok Content</span>
          </div>
          <h4 className="font-bold text-[16px] text-gray-900 line-clamp-2 leading-tight">Video Content</h4>
          <p className="text-[13px] text-gray-500 mt-2 line-clamp-4 leading-relaxed">Watch this content directly on TikTok to see comments and interactions.</p>
        </div>
      </div>
    )
  }

  if (igId) {
    return (
      <div className="rounded-2xl overflow-hidden border border-gray-100 hover:border-gray-300 bg-white w-full flex items-stretch h-[340px] my-4 transition-colors">
        <div className="w-[190px] shrink-0 bg-gray-50 border-r border-gray-100">
          <iframe src={`https://www.instagram.com/p/${igId}/embed/captioned/`} className="w-full h-[450px] border-0 -translate-y-[45px]" allow="autoplay; encrypted-media" loading="lazy" scrolling="no" />
        </div>
        <div className="p-5 flex-1 min-w-0 flex flex-col justify-center bg-gray-50/10">
          <div className="flex items-center gap-2 mb-3">
             <InstagramIcon className="w-5 h-5 text-pink-500" />
             <span className="text-[11px] font-bold text-gray-400 uppercase tracking-widest">Instagram Content</span>
          </div>
          <h4 className="font-bold text-[16px] text-gray-900 line-clamp-1">Instagram Post</h4>
          <a href={url} target="_blank" rel="noopener noreferrer" className="mt-3 text-[12px] font-bold text-primary hover:underline flex items-center gap-1">
            Open in App <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>
    )
  }

  if (spotify) {
    return (
      <div className="rounded-xl overflow-hidden border border-gray-100 hover:border-gray-300 bg-white my-4 transition-colors">
        <iframe src={`https://open.spotify.com/embed/${spotify.type}/${spotify.id}?utm_source=generator&theme=0`} width="100%" height={spotify.type === 'track' ? "80" : "152"} allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture" loading="lazy" className="block border-0"/>
      </div>
    )
  }

  // STANDARD PREVIEW (With X/Twitter Image Support if API provides it)
  if (!data) return null
  const hostname = new URL(url).hostname

  return (
    <a 
      href={url} 
      target="_blank" 
      rel="noopener noreferrer" 
      className="flex flex-col md:flex-row gap-0 bg-white hover:bg-gray-50/50 rounded-2xl border border-gray-100 group-hover:border-gray-300 transition-all group overflow-hidden my-4"
    >
      <div className="w-full md:w-40 h-48 md:h-auto shrink-0 overflow-hidden bg-gray-50 flex items-center justify-center relative border-b md:border-b-0 md:border-r border-gray-100/50">
        {data.image ? (
          <img 
            src={data.image} 
            alt={data.title} 
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
          />
        ) : (
          <div className="flex flex-col items-center gap-1 opacity-20 group-hover:opacity-40 transition-opacity">
            <LinkIcon className="w-10 h-10 text-orange-500" />
            <span className="text-[10px] font-black uppercase tracking-tighter">Preview</span>
          </div>
        )}
        <div className="absolute top-2 right-2 p-1.5 bg-white/90 backdrop-blur-sm rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-sm">
          <ExternalLink className="w-3 h-3 text-gray-500" />
        </div>
      </div>
      
      <div className="flex-1 p-5 md:py-4 md:pr-6 flex flex-col justify-center min-w-0">
        <div className="flex items-center gap-1.5 mb-2">
           <div className="w-1.5 h-1.5 bg-orange-500 rounded-full" />
           <p className="text-[10px] font-bold text-orange-500 truncate uppercase tracking-widest leading-none">
            {hostname}
           </p>
        </div>
        <h4 className="text-[16px] font-bold text-gray-900 group-hover:text-primary transition-colors line-clamp-2 mb-2 leading-snug">
          {data.title || hostname}
        </h4>
        <p className="text-[13px] text-gray-500 line-clamp-2 md:line-clamp-3 font-medium leading-relaxed">
          {data.description || `Explore more about ${hostname} and stay updated with their latest content.`}
        </p>
      </div>
    </a>
  )
}
