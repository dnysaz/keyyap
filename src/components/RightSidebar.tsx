'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { TrendingUp, Search } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { RandomSidebarAd } from '@/ads/AdManager'

interface TrendingHashtag {
  tag: string
  count: number
}

interface RightSidebarProps {
  hideSearch?: boolean
}

export default function RightSidebar({ hideSearch = false }: RightSidebarProps) {
  const [hashtags, setHashtags] = useState<TrendingHashtag[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    fetchTrendingTags()
  }, [])

  async function fetchTrendingTags() {
    setLoading(true)
    // Trending from last 7 days for the sidebar
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    
    const { data } = await supabase
      .from('posts')
      .select('hashtags, likes_count, comments_count')
      .gte('created_at', since.toISOString())
      .eq('is_deleted', false)
      .not('hashtags', 'is', null)
      .order('created_at', { ascending: false })
      .limit(100) // Optimization: and only process recent posts to avoid lag

    const hashtagCounts = new Map<string, number>()
    
    data?.forEach(post => {
      const tags = post.hashtags as string[]
      if (Array.isArray(tags)) {
        // Use a Set to avoid counting same tag multiple times if it was somehow duplicated in a single post
        const uniqueTagsInPost = new Set(tags.map(t => typeof t === 'string' ? t.toLowerCase().replace(/[^a-z0-9_]/g, '') : '').filter(t => t))
        uniqueTagsInPost.forEach(tag => {
          hashtagCounts.set(tag, (hashtagCounts.get(tag) || 0) + 1)
        })
      }
    })

    const sortedHashtags = Array.from(hashtagCounts.entries())
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)

    setHashtags(sortedHashtags)
    setLoading(false)
  }

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

      {/* Trending Section */}
      <div className="mt-4 bg-[#f7f9f9] rounded-2xl overflow-hidden border border-gray-50">
        <h2 className="px-4 py-3 text-xl font-extrabold text-gray-900">Trends for you</h2>
        
        {loading ? (
          <div className="px-4 py-6 space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="animate-pulse space-y-2">
                <div className="h-3 bg-gray-200 rounded w-1/4"></div>
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        ) : hashtags.length === 0 ? (
          <div className="px-4 py-6 text-center text-gray-500 text-sm">
            No trending tags yet
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {hashtags.map((item) => (
              <Link
                key={item.tag}
                href={`/search?tag=${item.tag}`}
                className="block px-4 py-3 hover:bg-[rgba(0,0,0,0.03)] transition-colors group"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-500">Trending in KeyYap</p>
                    <h3 className="font-bold text-gray-900 group-hover:underline">#{item.tag}</h3>
                    <p className="text-xs text-gray-500 mt-0.5">{formatPostCount(item.count)} posts</p>
                  </div>
                  <TrendingUp className="w-4 h-4 text-gray-400" />
                </div>
              </Link>
            ))}
            <Link
              href="/trending"
              className="block px-4 py-4 text-primary hover:bg-[rgba(0,0,0,0.03)] transition-colors text-sm font-medium"
            >
              Show more
            </Link>
          </div>
        )}
      </div>

      {/* Dummy Ad Section (Dynamic) */}
      <RandomSidebarAd />

      {/* Footer Info */}
      <div className="mt-4 px-4 pb-8 text-xs text-gray-500 space-y-1">
        <div className="flex flex-wrap gap-x-3 gap-y-1">
          <Link href="/terms" className="hover:underline">Terms of Service</Link>
          <Link href="/privacy" className="hover:underline">Privacy Policy</Link>
          <Link href="/cookies" className="hover:underline">Cookie Policy</Link>
        </div>
        <p>© {new Date().getFullYear()} KeyYap.com</p>
      </div>
    </aside>
  )
}
