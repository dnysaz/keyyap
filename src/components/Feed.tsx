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

  // Filter unique posts and apply guest limit if needed
  const uniquePosts = posts.filter((post, index, self) => index === self.findIndex(p => p.id === post.id))
  // CACHE LOGIC: If we have posts from a previous session, we'll show them immediately
  const displayPosts = user ? uniquePosts : uniquePosts.slice(0, 5)

  const fetchPosts = useCallback(async (pageNum: number = 0, append: boolean = false) => {
    // Only show loading if we have NO posts in cache
    if (!append && posts.length === 0) setLoading(true)

    const limit = 15
    const offset = pageNum * limit
    const activeTab = searchParams.get('tab') || 'foryou'
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

      if (!user) {
        query = query.filter('profiles.username', 'eq', 'keyyap')
      }

      if (isGlobal && user) {
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
        setPosts([...posts, ...finalPosts])
      } else {
        setPosts(finalPosts)
      }
      setHasMore((finalPosts?.length || 0) === limit)
    } catch (err) {
      console.error('Feed fetch error:', err)
    } finally {
      clearTimeout(timeoutId)
      setLoading(false)
    }
  }, [posts, setPosts, isGlobal, user])

  // Initial fetch logic: 
  // 1. Wait for auth and posts are hydrated from storage
  // 2. If data is stale (> 5 mins) or empty, fetch fresh data
  useEffect(() => {
    if (authHydrated && postsHydrated && !initialLoaded) {
      setInitialLoaded(true)
      
      const isStale = !lastFetched || (Date.now() - lastFetched > 5 * 60 * 1000)
      if (posts.length === 0 || isStale) {
        fetchPosts(0)
      }
    }
  }, [authHydrated, postsHydrated, initialLoaded, lastFetched, posts.length])

  // Tab switching always refreshes but doesn't necessarily show skeleton if we have old data
  useEffect(() => {
    if (initialLoaded) {
      setPage(0)
      fetchPosts(0)
    }
  }, [activeTab])

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

  const loadMore = () => {
    if (!loading && hasMore) {
      const nextPage = page + 1
      setPage(nextPage)
      fetchPosts(nextPage, true)
    }
  }

  useEffect(() => {
    const handleScroll = () => {
      if (!user) return
      if (window.innerHeight + document.documentElement.scrollTop >= document.documentElement.offsetHeight - 800 && hasMore && !loading) {
        loadMore()
      }
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [hasMore, loading, page, user])

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

      {loading && page > 0 && user && (
        <div className="py-12 flex justify-center">
          <div className="spinner border-primary/20 border-t-primary w-6 h-6" />
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