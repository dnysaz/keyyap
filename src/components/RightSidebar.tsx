'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { TrendingUp, Search } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { RandomSidebarAd } from '@/ads/AdManager'
import { usePostStore } from '@/stores/postStore'

interface RightSidebarProps {
  hideSearch?: boolean
}

export default function RightSidebar({ hideSearch = false }: RightSidebarProps) {
  const { trendingTags, fetchTrending } = usePostStore()
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    fetchTrending()
  }, [fetchTrending])

  function formatPostCount(count: number): string {
    if (count >= 1000000) return (count / 1000000).toFixed(1) + 'M'
    if (count >= 1000) return (count / 1000).toFixed(1) + 'K'
    return count.toString()
  }

  return (
    <aside className="hidden lg:block w-[350px] sticky top-0 h-screen py-3 px-4 ml-4 overflow-y-auto no-scrollbar">
      {/* Search Bar */}
      {!hideSearch && (
        <div className="bg-white pb-3 z-10 sticky top-0">
          <div className="relative group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 group-focus-within:text-primary transition-colors" />
            <input
              type="text"
              placeholder="Search KeyYap"
              className="w-full bg-gray-100 border-none rounded-full py-3 pl-12 pr-4 focus:ring-1 focus:ring-primary focus:bg-white transition-all outline-none text-sm"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && searchQuery.trim()) {
                  window.location.href = `/search?q=${encodeURIComponent(searchQuery.trim())}`
                }
              }}
            />
          </div>
        </div>
      )}

      {/* Top Promotion Slot */}
      <div className="mt-1 mb-4">
        <RandomSidebarAd />
      </div>

      {/* Trending Section */}
      <div className="mt-0 bg-[#f7f9f9] rounded-2xl overflow-hidden border border-gray-50 shadow-sm animate-in fade-in duration-500">
        <h2 className="px-4 py-3 text-xl font-extrabold text-gray-900">Trends for you</h2>
        
        {trendingTags.length === 0 ? (
          <div className="px-4 py-8 space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="animate-pulse space-y-2">
                <div className="h-3 bg-gray-200 rounded w-1/4"></div>
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              </div>
            ))}
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {trendingTags.map((item) => (
              <Link
                key={item.tag}
                href={`/search?tag=${item.tag}`}
                className="block px-4 py-3 hover:bg-[rgba(0,0,0,0.03)] transition-colors group"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-500 font-medium uppercase tracking-tight">Trending in KeyYap</p>
                    <h3 className="font-bold text-gray-900 group-hover:underline">#{item.tag}</h3>
                    <p className="text-xs text-gray-400 mt-0.5">{formatPostCount(item.count)} posts</p>
                  </div>
                  <TrendingUp className="w-4 h-4 text-gray-300" />
                </div>
              </Link>
            ))}
            <Link
              href="/trending"
              className="block px-4 py-4 text-primary hover:bg-[rgba(0,0,0,0.03)] transition-colors text-sm font-bold"
            >
              Show more
            </Link>
          </div>
        )}
      </div>

      {/* Dummy Ad Section (Dynamic) */}
      <div className="mt-4">
        <RandomSidebarAd />
      </div>

      {/* Footer Info */}
      <div className="mt-6 px-4 pb-8 text-[11px] text-gray-400 font-medium space-y-1 leading-normal tracking-wide">
        <div className="flex flex-wrap gap-x-3 gap-y-1">
          <Link href="/terms" className="hover:underline">Terms of Service</Link>
          <Link href="/privacy" className="hover:underline">Privacy Policy</Link>
          <Link href="/cookies" className="hover:underline">Cookie Policy</Link>
        </div>
        <p>© {new Date().getFullYear()} KeyYap.com — Made with ❤️</p>
      </div>
    </aside>
  )
}
