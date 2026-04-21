'use client'

import React, { useState, useEffect } from 'react'

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
      className="block bg-white border border-gray-100 rounded-2xl p-4 md:p-6 hover:bg-gray-50/50 transition-all group my-6 shadow-sm"
    >
      <div className="flex flex-col gap-3">
        {/* Header: Site Info */}
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-orange-50 rounded-full flex items-center justify-center shrink-0">
             <div className="w-3 h-3 bg-orange-500 rounded-full animate-pulse" />
          </div>
          <span className="text-[12px] font-black text-gray-500 uppercase tracking-widest">
            {hostname}
          </span>
        </div>

        {/* Inner Content */}
        <div className="space-y-1">
          <h4 className="text-lg md:text-xl font-black text-gray-900 group-hover:text-orange-500 transition-colors leading-tight">
            {data.title}
          </h4>
          {data.description && (
            <p className="text-[14px] text-gray-600 font-medium leading-relaxed line-clamp-2">
              {data.description}
            </p>
          )}
        </div>

        {/* Featured Image */}
        {data.image && (
          <div className="mt-2 rounded-xl overflow-hidden aspect-video border border-gray-50 relative bg-gray-50">
            <img 
              src={data.image} 
              alt={data.title} 
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
            />
          </div>
        )}

        {/* Action Meta */}
        <div className="flex items-center gap-1.5 text-orange-500 font-bold text-[12px] mt-1 italic">
          Visit {hostname}
          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
          </svg>
        </div>
      </div>
    </a>
  )
}
