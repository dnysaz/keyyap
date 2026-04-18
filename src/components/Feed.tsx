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
  const { user, loading: authLoading } = useAuthStore()

  const { posts, setPosts } = usePostStore()

  const [loading, setLoading] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [page, setPage] = useState(0)
  const [newPostsCount, setNewPostsCount] = useState(0)
  const [initialLoaded, setInitialLoaded] = useState(false)

  const uniquePosts = posts.filter((post, index, self) => index === self.findIndex(p => p.id === post.id))
  const displayPosts = user ? uniquePosts : uniquePosts.slice(0, 5)

  const fetchPosts = useCallback(async (pageNum: number = 0, append: boolean = false) => {
    if (!append && displayPosts.length === 0) setLoading(true)

    const limit = 15
    const offset = pageNum * limit
    const activeTab = searchParams.get('tab') || 'foryou'
    const currentUserId = useAuthStore.getState().user?.id || null
    console.log(`🔍 Feed: Starting fetch for tab "${activeTab}", page ${pageNum}, append: ${append}, user: ${currentUserId}`)

    // Safety timeout for this specific fetch
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Fetch timeout')), 10000)
    )

    try {
      let queryPromise = (async () => {
        let query = supabase
          .from('posts')
          .select(`
            *,
            profiles:user_id!inner(id,username,full_name,avatar_url,hide_from_global,hide_from_search)
          `)
          .eq('is_deleted', false)
          .order('created_at', { ascending: false })
          .range(offset, offset + limit - 1)

        console.log('📡 Feed: Fetching following list...')
        let followingIds: string[] = []
        
        if (currentUserId) {
          const { data: following, error: fError } = await supabase
            .from('follows')
            .select('following_id')
            .eq('follower_id', currentUserId)
  
          if (fError) console.error('❌ Follows fetch error:', fError)
          followingIds = following?.map(f => f.following_id) || []
        }

        const allowedIds = [...followingIds, currentUserId].filter(Boolean) as string[]
        console.log(`👥 Feed: allowedIds [${allowedIds.length}] :`, allowedIds)

        // Global Guest Filter: If not logged in, ALWAYS only show 'keyyap' posts
        if (!user) {
          query = query.filter('profiles.username', 'eq', 'keyyap')
        }

        // Filter logic: Standard Global Feed
        if (isGlobal && user) {
          // Logged in users: show all non-hidden posts
          query = query.filter('profiles.hide_from_global', 'neq', true)
        }

        if (currentUserId && !isGlobal) {
          if (followingIds.length > 0) {
            // User follows people, show their posts + user's own posts
            query = query.in('user_id', allowedIds)
          } else {
            // User follows NO ONE: Show user's own posts OR official 'keyyap' posts
            query = query.or(`user_id.eq.${currentUserId},profiles.username.eq.keyyap`)
          }
        }

        console.log('📡 Feed: Executing posts query...')
        const { data: postsResult, error: postsError } = await query

        if (postsError) {
          console.error('❌ Posts query error:', postsError)
          throw postsError
        }

        console.log(`✅ Feed: Received ${postsResult?.length || 0} posts from DB`)

        // Fetch quotes
        const quotedPostIds = (postsResult || []).map(p => (p as any).quoted_post_id).filter(id => id != null)
        let quotedPostsMap: Record<string, any> = {}
        if (quotedPostIds.length > 0) {
          const { data: qpData } = await supabase
            .from('posts')
            .select('*, profiles:user_id (id, username, full_name, avatar_url)')
            .in('id', quotedPostIds)
          qpData?.forEach((qp: any) => { quotedPostsMap[qp.id] = qp })
        }

        // Check likes
        const postIds = (postsResult || []).map(p => p.id)
        let userLikes: string[] = []
        if (currentUserId && postIds.length > 0) {
          const { data: likesData } = await supabase.from('post_likes').select('post_id').eq('user_id', currentUserId).in('post_id', postIds)
          userLikes = likesData?.map(l => l.post_id) || []
        }

        const finalPosts = (postsResult || []).map((post: any) => ({
          ...post,
          quoted_post: post.quoted_post_id ? quotedPostsMap[post.quoted_post_id] || null : null,
          is_liked: userLikes.includes(post.id),
        })) as unknown as Post[]

        return finalPosts
      })()

      // Race the query against the timeout
      const finalPosts = await Promise.race([queryPromise, timeoutPromise]) as Post[]
      console.log(`✨ Feed: Fetch complete. Final posts to render: ${finalPosts.length}`)

      if (append) {
        setPosts([...posts, ...finalPosts])
      } else {
        setPosts(finalPosts)
      }
      setHasMore((finalPosts?.length || 0) === limit)
    } catch (err) {
      console.error('💥 Feed critical error:', err)
    } finally {
      setLoading(false)
    }
  }, [posts, setPosts, isGlobal, user])

  // Initial fetch: wait for auth to settle, then fetch once
  useEffect(() => {
    if (!authLoading && !initialLoaded) {
      setInitialLoaded(true)
      fetchPosts(0)
    }
  }, [authLoading, initialLoaded])

  // Tab switching refreshes data
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
      // Disable infinite scroll if user is not logged in OR if there are no more posts
      if (!user || user === null) return

      if (window.innerHeight + document.documentElement.scrollTop >= document.documentElement.offsetHeight - 800 && hasMore && !loading) {
        loadMore()
      }
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [hasMore, loading, page, user])

  // Show skeleton while auth is loading OR while doing initial data fetch
  const showSkeleton = authLoading || (loading && uniquePosts.length === 0)

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

      {/* Paywall: Show this when the guest hits the 5-post limit */}
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