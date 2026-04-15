'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Home, Search, Heart, LogOut, User, TrendingUp, Repeat } from 'lucide-react'
import { usePathname } from 'next/navigation'
import Sidebar from '@/components/Sidebar'
import RightSidebar from '@/components/RightSidebar'
import { FeedSkeleton } from '@/components/Skeleton'
import Navigation from '@/components/Navigation'
import MainTabs from '@/components/MainTabs'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import AuthGuard from '@/components/AuthGuard'


function formatCount(count: number): string {
  if (count >= 1000000) return (count / 1000000).toFixed(1) + 'M'
  if (count >= 1000) return (count / 1000).toFixed(1) + 'K'
  return count.toString()
}

export default function TrendingPage() {
  const [hashtags, setHashtags] = useState<{ tag: string, count: number }[]>([])
  const [loading, setLoading] = useState(true)
  const [timeFilter, setTimeFilter] = useState<'day' | 'week' | 'month'>('week')

  useEffect(() => {
    fetchTrendingHashtags()
  }, [timeFilter])

  async function fetchTrendingHashtags() {
    setLoading(true)
    
    // Set date range based on filter
    const now = new Date()
    let startDate = new Date()
    if (timeFilter === 'day') startDate.setDate(now.getDate() - 1)
    else if (timeFilter === 'week') startDate.setDate(now.getDate() - 7)
    else if (timeFilter === 'month') startDate.setMonth(now.getMonth() - 1)

    const { data, error } = await supabase
      .from('posts')
      .select('hashtags, likes_count, comments_count, created_at')
      .gte('created_at', startDate.toISOString())
      .eq('is_deleted', false)
      .not('hashtags', 'is', null)
      .order('created_at', { ascending: false })
      .limit(200)

    if (error) {
      console.error('Error fetching trending hashtags:', error)
      setLoading(false)
      return
    }

    const hashtagCounts = new Map<string, number>()
    
    data?.forEach(post => {
      const tags = post.hashtags as string[]
      if (Array.isArray(tags)) {
        tags.forEach(tag => {
          const safeTag = tag.toLowerCase().trim().replace(/[^a-z0-9_]/g, '')
          if (safeTag) {
            // Weight scoring: base 1 + likes + (comments * 2)
            const score = 1 + (post.likes_count || 0) + (post.comments_count || 0) * 2;
            hashtagCounts.set(safeTag, (hashtagCounts.get(safeTag) || 0) + score)
          }
        })
      }
    })

    const sortedHashtags = Array.from(hashtagCounts.entries())
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 50)
      
    setHashtags(sortedHashtags)
    setLoading(false)
  }

  return (
    <AuthGuard>
      <div className="min-h-screen bg-white">
        <Sidebar />
        <div className="lg:ml-[68px] xl:ml-[275px] flex justify-center">
          <div className="flex w-full max-w-[1050px] items-start">
            <main className="flex-1 max-w-2xl border-x border-gray-100 min-h-screen">
              <MainTabs />
              <div className="p-4 border-b border-gray-100">
                <h1 className="text-xl font-bold flex items-center gap-2">Trending Hashtags</h1>
              </div>
              
              <div className="flex border-b border-gray-100">
                <button
                  onClick={() => setTimeFilter('day')}
                  className={`flex-1 py-3 text-center text-sm font-medium ${timeFilter === 'day' ? 'border-b-2 border-primary text-primary' : 'text-gray-500'}`}
                >
                  Today
                </button>
                <button
                  onClick={() => setTimeFilter('week')}
                  className={`flex-1 py-3 text-center text-sm font-medium ${timeFilter === 'week' ? 'border-b-2 border-primary text-primary' : 'text-gray-500'}`}
                >
                  This Week
                </button>
                <button
                  onClick={() => setTimeFilter('month')}
                  className={`flex-1 py-3 text-center text-sm font-medium ${timeFilter === 'month' ? 'border-b-2 border-primary text-primary' : 'text-gray-500'}`}
                >
                  This Month
                </button>
              </div>

              {loading ? (
                <FeedSkeleton count={5} />
              ) : hashtags.length === 0 ? (
                <div className="p-8 text-center text-gray-500">
                  <p>No trending hashtags yet</p>
                  <p className="text-sm mt-2">Create posts with hashtags to see them here</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100 pb-16">
                  {hashtags.map((item, index) => (
                    <Link key={item.tag} href={`/search?tag=${item.tag}`} className="block p-4 hover:bg-gray-50 flex items-center justify-between group">
                      <div className="flex gap-4 items-center">
                        <div className="text-xl font-bold text-gray-300 group-hover:text-primary transition-colors w-10 text-center">
                          {index + 1}
                        </div>
                        <div>
                          <h3 className="font-bold text-gray-900 text-lg group-hover:underline">#{item.tag}</h3>
                          <p className="text-sm text-gray-500">{formatCount(Math.round(item.count))} trending score</p>
                        </div>
                      </div>
                      <div>
                        <TrendingUp className="w-5 h-5 text-gray-400 group-hover:text-primary transition-colors" />
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </main>
            <RightSidebar />
          </div>
        </div>
        <div className="lg:hidden">
          <Navigation />
        </div>
      </div>
    </AuthGuard>
  )
}