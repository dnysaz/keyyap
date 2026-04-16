'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Home, Search, Heart, LogOut, User, TrendingUp, Repeat } from 'lucide-react'
import { usePathname } from 'next/navigation'
import PostCard from '@/components/PostCard'
import Sidebar from '@/components/Sidebar'
import RightSidebar from '@/components/RightSidebar'
import { FeedSkeleton } from '@/components/Skeleton'
import Navigation from '@/components/Navigation'
import MainTabs from '@/components/MainTabs'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import AuthGuard from '@/components/AuthGuard'

export default function RepostedPage() {
  const { user } = useAuthStore()
  const [posts, setPosts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(true)

  useEffect(() => {
    fetchRepostedPosts(0)
  }, [])

  async function fetchRepostedPosts(pageNum: number = 0, append: boolean = false) {
    if (!append) setLoading(true)
    const limit = 15
    const offset = pageNum * limit

    try {
      // 1. Fetch Simple Reposts (from reposts table)
      const { data: simpleReposts } = await supabase
        .from('reposts')
        .select(`
          original_post_id,
          created_at,
          profiles:user_id (username)
        `)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1)

      // 2. Fetch Quote Reposts (from posts table where quoted_post_id is not null)
      const { data: quoteReposts } = await supabase
        .from('posts')
        .select(`
          *,
          profiles:user_id (id, username, full_name, avatar_url)
        `)
        .not('quoted_post_id', 'is', null)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1)

      // Fetch quoted posts for quote reposts separately
      const quoteQpIds = (quoteReposts || []).map((p: any) => p.quoted_post_id).filter(Boolean) as string[]
      let quoteQpMap: Record<string, any> = {}
      if (quoteQpIds.length > 0) {
        const { data: qpData } = await supabase
          .from('posts')
          .select('*, profiles:user_id (id, username, full_name, avatar_url)')
          .in('id', quoteQpIds)
        qpData?.forEach((qp: any) => { quoteQpMap[qp.id] = qp })
      }
      quoteReposts?.forEach((p: any) => {
        if (p.quoted_post_id) p.quoted_post = quoteQpMap[p.quoted_post_id] || null
      })

      // 3. Fetch original posts for simple reposts
      let resolvedSimplePosts: any[] = []
      if (simpleReposts && simpleReposts.length > 0) {
        const postIds = simpleReposts.map(r => r.original_post_id)
        const { data: originalPosts } = await supabase
          .from('posts')
          .select('*, profiles(*)')
          .in('id', postIds)
          .eq('is_deleted', false)

        resolvedSimplePosts = simpleReposts.map(repost => {
          const original = originalPosts?.find(p => p.id === repost.original_post_id)
          if (!original) return null
          return {
            ...original,
            reposted_at: repost.created_at,
            reposter_username: (repost.profiles as any)?.username,
            type: 'simple'
          }
        }).filter(p => p !== null)
      }

      // 4. Mark quote reposts
      const resolvedQuotePosts = (quoteReposts || []).map(p => ({
        ...p,
        reposted_at: p.created_at,
        reposter_username: p.profiles?.username,
        type: 'quote'
      }))

      // 5. Combine and Sort by reposted_at
      const allReposts = [...resolvedSimplePosts, ...resolvedQuotePosts]
        .sort((a, b) => new Date(b.reposted_at).getTime() - new Date(a.reposted_at).getTime())
        .slice(0, limit)

      // 6. Check likes
      if (user && allReposts.length > 0) {
        const ids = allReposts.map(p => p.id)
        const { data: likesData } = await supabase
          .from('post_likes')
          .select('post_id')
          .eq('user_id', user.id)
          .in('post_id', ids)

        const likedIds = new Set(likesData?.map(l => l.post_id) || [])
        allReposts.forEach(p => {
          p.is_liked = likedIds.has(p.id)
        })
      }

      if (append) {
        setPosts(prev => [...prev, ...allReposts])
      } else {
        setPosts(allReposts)
      }

      setHasMore(allReposts.length === limit)
    } catch (error) {
      console.error('Error fetching reposted posts:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadMore = () => {
    if (!loading && hasMore) {
      const nextPage = page + 1
      setPage(nextPage)
      fetchRepostedPosts(nextPage, true)
    }
  }

  useEffect(() => {
    const handleScroll = () => {
      if (
        window.innerHeight + document.documentElement.scrollTop >= document.documentElement.offsetHeight - 800 &&
        hasMore &&
        !loading
      ) {
        loadMore()
      }
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [hasMore, loading, page])

  return (
    <AuthGuard>
      <div className="min-h-screen bg-white">
        <Sidebar />
        <div className="lg:ml-[72px] xl:ml-[260px] flex justify-center">
          <div className="flex w-full max-w-[1050px] items-start">
            <main className="flex-1 max-w-2xl w-full border-x border-gray-100 min-h-screen bg-white min-w-0">
              <MainTabs />
              <div className="p-4 border-b border-gray-50 flex items-center justify-between sticky top-[53px] bg-white/80 backdrop-blur-md z-20">
                <h1 className="text-xl font-bold tracking-tight">Recently Reposted</h1>
              </div>

              <div className="pb-16 divide-y divide-gray-100">
                {loading && page === 0 ? (
                  <FeedSkeleton count={3} />
                ) : posts.length === 0 ? (
                  <div className="text-center py-20 text-gray-500">
                    <Repeat className="w-12 h-12 mx-auto mb-4 text-gray-200" />
                    <p className="text-lg font-bold text-gray-300">No reposts yet</p>
                    <p className="text-sm mt-1">Discover and share great thoughts!</p>
                  </div>
                ) : (
                  <>
                    {posts.map((post, idx) => (
                      <PostCard
                        key={`${post.id}-${post.reposted_at}-${idx}`}
                        post={post}
                        currentUserId={user?.id}
                        reposterUsername={post.reposter_username}
                      />
                    ))}
                    {loading && (
                      <div className="py-12 flex justify-center">
                        <div className="spinner border-primary/20 border-t-primary w-6 h-6" />
                      </div>
                    )}
                  </>
                )}
              </div>
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