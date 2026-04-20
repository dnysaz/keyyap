'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import PostCard from './PostCard'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import { usePostStore } from '@/stores/postStore'
import { FeedSkeleton } from './Skeleton'
import { RandomFeedAd } from '@/ads/AdManager'
import type { Post } from '@/types'

interface FeedProps {
  isGlobal?: boolean
}

export default function Feed({ isGlobal = false }: FeedProps) {
  const searchParams = useSearchParams()
  const activeTab = searchParams.get('tab') || 'foryou'
  const { user, loading: authLoading, _hasHydrated: authHydrated } = useAuthStore()

  const { posts, setPosts, _hasHydrated: postsHydrated, lastFetched } = usePostStore()

  const [loading, setLoading] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [page, setPage] = useState(0)
  const [newPostsCount, setNewPostsCount] = useState(0)
  const [initialLoaded, setInitialLoaded] = useState(false)

  // Refs to avoid stale closures in scroll handler
  const pageRef = useRef(0)
  const loadingRef = useRef(false)
  const hasMoreRef = useRef(true)

  // Keep refs in sync with state
  useEffect(() => { pageRef.current = page }, [page])
  useEffect(() => { loadingRef.current = loading }, [loading])
  useEffect(() => { hasMoreRef.current = hasMore }, [hasMore])

  // Filter unique posts and apply guest limit if needed
  const uniquePosts = posts.filter((post, index, self) => index === self.findIndex(p => p.id === post.id))
  // CACHE LOGIC: If we have posts from a previous session, we'll show them immediately
  const displayPosts = user ? uniquePosts : uniquePosts.slice(0, 5)

  const fetchPosts = useCallback(async (pageNum: number = 0, append: boolean = false) => {
    // Only show loading if we have NO posts or it's a fresh fetch
    if (!append) setLoading(true)
    loadingRef.current = true

    const limit = 15
    const offset = pageNum * limit
    const currentUserId = useAuthStore.getState().user?.id || null

    // Safety timeout
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 10000)

    try {
      let query = supabase
        .from('posts')
        .select(`
          *,
          profiles:user_id!inner(id,username,full_name,avatar_url,hide_from_global,hide_from_search)
        `)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1)

      let followingIds: string[] = []
      
      if (currentUserId) {
        const { data: following } = await supabase
          .from('follows')
          .select('following_id')
          .eq('follower_id', currentUserId)
        followingIds = following?.map(f => f.following_id) || []
      }

      const allowedIds = [...followingIds, currentUserId].filter(Boolean) as string[]

      if (!currentUserId) {
        // Guest mode: only show keyyap's posts
        query = query.filter('profiles.username', 'eq', 'keyyap')
      }

      if (isGlobal && currentUserId) {
        query = query.filter('profiles.hide_from_global', 'neq', true)
      }

      if (currentUserId && !isGlobal) {
        if (followingIds.length > 0) {
          query = query.in('user_id', allowedIds)
        } else {
          query = query.or(`user_id.eq.${currentUserId},profiles.username.eq.keyyap`)
        }
      }

      const { data: postsResult, error: postsError } = await query

      if (postsError) throw postsError

      // Fetch quotes and likes
      const postIds = (postsResult || []).map(p => p.id)
      const quotedPostIds = (postsResult || []).map(p => (p as any).quoted_post_id).filter(id => id != null)
      
      let quotedPostsMap: Record<string, any> = {}
      let userLikes: string[] = []

      const [quotesRes, likesRes] = await Promise.all([
        quotedPostIds.length > 0 ? supabase.from('posts').select('*, profiles:user_id (id, username, full_name, avatar_url)').in('id', quotedPostIds) : Promise.resolve({ data: [] }),
        (currentUserId && postIds.length > 0) ? supabase.from('post_likes').select('post_id').eq('user_id', currentUserId).in('post_id', postIds) : Promise.resolve({ data: [] })
      ])

      quotesRes.data?.forEach((qp: any) => { quotedPostsMap[qp.id] = qp })
      userLikes = likesRes.data?.map((l: any) => l.post_id) || []

      const finalPosts = (postsResult || []).map((post: any) => ({
        ...post,
        quoted_post: post.quoted_post_id ? quotedPostsMap[post.quoted_post_id] || null : null,
        is_liked: userLikes.includes(post.id),
      })) as unknown as Post[]

      if (append) {
        setPosts([...usePostStore.getState().posts, ...finalPosts])
      } else {
        setPosts(finalPosts)
      }
      setHasMore((finalPosts?.length || 0) === limit)
      hasMoreRef.current = (finalPosts?.length || 0) === limit
    } catch (err) {
      console.error('Feed fetch error:', err)
    } finally {
      clearTimeout(timeoutId)
      setLoading(false)
      loadingRef.current = false
    }
  }, [setPosts, isGlobal])

  // Initial and reactive fetch logic
  useEffect(() => {
    if (authHydrated && postsHydrated) {
      // If user ID changes (login/logout) or tab changes, we always fetch fresh
      fetchPosts(0)
      setPage(0)
      pageRef.current = 0
    }
  }, [user?.id, activeTab, authHydrated, postsHydrated, isGlobal, fetchPosts])

  // Realtime: listen for new posts
  useEffect(() => {
    const channel = supabase
      .channel('public:posts_feed')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'posts' }, () => {
        setNewPostsCount(prev => prev + 1)
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [])

  const loadMore = useCallback(() => {
    if (!loadingRef.current && hasMoreRef.current) {
      const nextPage = pageRef.current + 1
      setPage(nextPage)
      pageRef.current = nextPage
      fetchPosts(nextPage, true)
    }
  }, [fetchPosts])

  useEffect(() => {
    const handleScroll = () => {
      if (!user) return
      if (
        window.innerHeight + document.documentElement.scrollTop >= document.documentElement.offsetHeight - 800 &&
        hasMoreRef.current &&
        !loadingRef.current
      ) {
        loadMore()
      }
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [user, loadMore])

  // Improved loading state: Only show skeleton if we truly have nothing to show yet
  const showSkeleton = authLoading || (loading && displayPosts.length === 0)

  return (
    <div className="animate-in fade-in duration-500">
      {newPostsCount > 0 && (
        <button
          onClick={() => { setNewPostsCount(0); fetchPosts(0) }}
          className="sticky top-[57px] z-20 w-full bg-primary text-white py-2.5 text-center font-bold hover:bg-primary-hover transition-all shadow-lg animate-in slide-in-from-top-4"
        >
          {newPostsCount} new yaps! ✨
        </button>
      )}

      {showSkeleton ? (
        <FeedSkeleton count={user ? 5 : 3} />
      ) : displayPosts.length === 0 ? (
        <div className="py-20 text-center">
          <p className="text-gray-400 font-bold">No yaps found here...</p>
        </div>
      ) : (
        <div className="divide-y divide-gray-50">
          {displayPosts.map((post, index) => (
            <React.Fragment key={post.id}>
              <PostCard post={post} currentUserId={user?.id} />
              {(index + 1) % 7 === 0 && <RandomFeedAd />}
            </React.Fragment>
          ))}
        </div>
      )}

      {loading && page > 0 && (
        <div className="py-12 flex justify-center">
          <div className="jumping-dots">
            <div className="dot"></div>
            <div className="dot"></div>
            <div className="dot"></div>
          </div>
        </div>
      )}

      {!user && !authLoading && displayPosts.length > 0 && (
        <div className="py-16 px-4 bg-gray-50/50 border-t border-gray-100 flex flex-col items-center justify-center text-center">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 w-full max-w-sm">
            <h3 className="text-xl font-bold text-gray-900 mb-2">Read more on KeyYap</h3>
            <p className="text-[14px] text-gray-500 mb-6">Log in to discover more posts, leave comments, and join the conversation.</p>
            <Link href="/login" className="block w-full py-3 bg-primary text-white rounded-full font-bold hover:bg-primary-hover transition-colors shadow-sm mb-3">
              Log In
            </Link>
            <Link href="/signup" className="block w-full py-3 bg-white text-primary border border-primary rounded-full font-bold hover:bg-gray-50 transition-colors">
              Sign Up
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}