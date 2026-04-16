'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
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

  const fetchPosts = useCallback(async (pageNum: number = 0, append: boolean = false) => {
    if (!append && posts.length === 0) setLoading(true)
    
    const limit = 15
    const offset = pageNum * limit
    const currentUserId = useAuthStore.getState().user?.id || null

    try {
      let query = supabase
        .from('posts')
        .select(`
          *,
          profiles:user_id (id, username, full_name, avatar_url)
        `)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1)

      if (currentUserId && !isGlobal) {
        const { data: following } = await supabase
          .from('follows')
          .select('following_id')
          .eq('follower_id', currentUserId)
        
        const followingIds = following?.map(f => f.following_id) || []
        const allowedIds = [...followingIds, currentUserId]
        if (allowedIds.length > 0) {
          query = query.in('user_id', allowedIds)
        }
      }

      const { data: postsResult, error: postsError } = await query
      if (postsError) throw postsError

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

      if (append) {
        setPosts([...posts, ...finalPosts])
      } else {
        setPosts(finalPosts)
      }
      setHasMore((postsResult?.length || 0) === limit)
    } catch (err) {
      console.error('Feed error:', err)
    } finally {
      setLoading(false)
    }
  }, [posts, setPosts, isGlobal])

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
      if (window.innerHeight + document.documentElement.scrollTop >= document.documentElement.offsetHeight - 800 && hasMore && !loading) {
        loadMore()
      }
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [hasMore, loading, page])

  const uniquePosts = posts.filter((post, index, self) => index === self.findIndex(p => p.id === post.id))

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
        <FeedSkeleton count={5} />
      ) : uniquePosts.length === 0 ? (
        <div className="py-20 text-center">
            <p className="text-gray-400 font-bold">No yaps found here...</p>
        </div>
      ) : (
        <div className="divide-y divide-gray-50">
          {uniquePosts.map((post, index) => (
            <React.Fragment key={post.id}>
              <PostCard post={post} currentUserId={user?.id} />
              {(index + 1) % 7 === 0 && <RandomFeedAd />}
            </React.Fragment>
          ))}
        </div>
      )}

      {loading && page > 0 && (
        <div className="py-12 flex justify-center">
          <div className="spinner border-primary/20 border-t-primary w-6 h-6" />
        </div>
      )}
    </div>
  )
}