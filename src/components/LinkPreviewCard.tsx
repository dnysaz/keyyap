'use client'

import React, { useState, useEffect } from 'react'
import { Link as LinkIcon } from 'lucide-react'

interface LinkPreviewData {
  title: string
  description: string
  image: string
  url: string
}

export default function LinkPreviewCard({ url }: { url: string }) {
  const [data, setData] = useState<LinkPreviewData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
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

  if (!data) return null

  const hostname = new URL(url).hostname

  return (
    <a 
      href={url} 
      target="_blank" 
      rel="noopener noreferrer" 
      className="flex gap-4 p-0 bg-white hover:bg-gray-50 rounded-2xl border border-gray-100 transition-all group overflow-hidden my-4"
    >
      {/* Image Section - Always show something */}
      <div className="w-24 md:w-44 shrink-0 border-r border-gray-50 overflow-hidden bg-gray-50 flex items-center justify-center">
        {data.image ? (
          <img 
            src={data.image} 
            alt={data.title} 
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        ) : (
          <div className="flex flex-col items-center gap-1 opacity-20 group-hover:opacity-40 transition-opacity">
            <LinkIcon className="w-8 h-8 text-orange-500" />
            <span className="text-[10px] font-black uppercase tracking-tighter">KeyYap Preview</span>
          </div>
        )}
      </div>
      
      <div className="flex-1 py-4 pr-4 min-w-0 flex flex-col justify-center">
        <h4 className="text-[15px] font-black text-gray-900 group-hover:text-orange-500 transition-colors line-clamp-1 mb-1">
          {data.title || hostname}
        </h4>
        <p className="text-[13px] text-gray-500 line-clamp-2 font-medium leading-relaxed mb-2">
          {data.description || `Visit ${hostname} to see more details and content from this source.`}
        </p>
        <div className="flex items-center gap-1.5">
           <div className="w-1.5 h-1.5 bg-orange-500 rounded-full animate-pulse" />
           <p className="text-[12px] font-black text-orange-500 truncate uppercase tracking-tight">
            {hostname}
           </p>
        </div>
      </div>
    </a>
  )
}
