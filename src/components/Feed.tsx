'use client'

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import PostCard from './PostCard'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
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

  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [hasMore, setHasMore] = useState(true)
  const [page, setPage] = useState(0)
  const [newPostsCount, setNewPostsCount] = useState(0)
  const postsRef = useRef<Post[]>([])
  const hasFetchedRef = useRef(false)

  // Keep postsRef in sync
  useEffect(() => {
    postsRef.current = posts
  }, [posts])

  const fetchPosts = useCallback(async (pageNum: number = 0, append: boolean = false) => {
    if (!append) setLoading(true)
    const limit = 10
    const offset = pageNum * limit
    const currentUserId = useAuthStore.getState().user?.id || null

    try {
      // 1. Fetch posts WITH profiles (NO self-join for quoted posts - Supabase can't handle it with RLS)
      let query = supabase
        .from('posts')
        .select(`
          *,
          profiles:user_id (id, username, full_name, avatar_url)
        `)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1)

      // 2. Filter for logged in users to only show following + self (unless isGlobal)
      if (currentUserId && !isGlobal) {
        const { data: following } = await supabase
          .from('follows')
          .select('following_id')
          .eq('follower_id', currentUserId)
        
        const followingIds = following?.map(f => f.following_id) || []
        // Include self
        const allowedIds = [...followingIds, currentUserId]
        
        if (allowedIds.length > 0) {
          query = query.in('user_id', allowedIds)
        }
      }

      const { data: postsResult, error: postsError } = await query

      if (postsError) {
        console.error('Error fetching posts:', postsError)
        setLoading(false)
        return
      }

      // 3. Fetch quoted posts separately (self-referencing JOINs fail with Supabase RLS)
      const quotedPostIds = (postsResult || [])
        .map(p => (p as any).quoted_post_id)
        .filter((id: string | null) => id != null) as string[]

      let quotedPostsMap: Record<string, any> = {}
      if (quotedPostIds.length > 0) {
        const { data: quotedPosts } = await supabase
          .from('posts')
          .select('*, profiles:user_id (id, username, full_name, avatar_url)')
          .in('id', quotedPostIds)

        if (quotedPosts) {
          quotedPosts.forEach((qp: any) => {
            quotedPostsMap[qp.id] = qp
          })
        }
      }

      const postIds = (postsResult || []).map(p => p.id)
      
      // 4. Check which posts the current user has liked
      let userLikes: string[] = []
      if (currentUserId && postIds.length > 0) {
        const { data: likesData } = await supabase
          .from('post_likes')
          .select('post_id')
          .eq('user_id', currentUserId)
          .in('post_id', postIds)
        userLikes = likesData?.map(l => l.post_id) || []
      }

      const finalPosts = (postsResult || []).map((post: any) => ({
        ...post,
        quoted_post: post.quoted_post_id ? quotedPostsMap[post.quoted_post_id] || null : null,
        is_liked: userLikes.includes(post.id),
      })) as unknown as Post[]

      if (append) {
        setPosts((prev) => [...prev, ...finalPosts])
      } else {
        const prevPosts = postsRef.current
        const isNewPosts = finalPosts.length > 0 &&
          prevPosts.length > 0 &&
          finalPosts[0].id !== prevPosts[0]?.id

        if (isNewPosts && pageNum === 0) {
          setNewPostsCount(finalPosts.length)
        }
        setPosts(finalPosts)
      }

      setHasMore((postsResult?.length || 0) === limit)
    } catch (err) {
      console.error('Feed fetch error:', err)
    } finally {
      setLoading(false)
    }
  }, [activeTab])

  // Fetch posts as soon as auth is resolved (logged in OR guest)
  useEffect(() => {
    if (!authLoading && !hasFetchedRef.current) {
      hasFetchedRef.current = true
      setPage(0)
      fetchPosts(0)
    }
  }, [authLoading, fetchPosts])

  // Re-fetch when user logs in/out
  useEffect(() => {
    if (!authLoading && hasFetchedRef.current) {
      setPage(0)
      fetchPosts(0)
    }
  }, [user?.id])

  // Re-fetch when tab changes
  useEffect(() => {
    if (!authLoading) {
      setPage(0)
      setNewPostsCount(0)
      fetchPosts(0)
    }
  }, [activeTab])

  // Realtime subscription
  useEffect(() => {
    const currentUserId = user?.id || null

    const channel = supabase
      .channel('public:posts')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'posts',
        filter: 'is_deleted=eq.false',
      }, async (payload) => {
        const newPost = payload.new as any

        // Fetch the new post with profile
        const { data: fullPost, error: fetchErr } = await supabase
          .from('posts')
          .select(`
            *,
            profiles:user_id (id, username, full_name, avatar_url)
          `)
          .eq('id', newPost.id)
          .single()

        if (!fetchErr && fullPost) {
          let postWithQuote = fullPost as any

          // Fetch quoted post separately if needed
          if (postWithQuote.quoted_post_id) {
            const { data: quotedPost } = await supabase
              .from('posts')
              .select('*, profiles:user_id (id, username, full_name, avatar_url)')
              .eq('id', postWithQuote.quoted_post_id)
              .single()
            postWithQuote.quoted_post = quotedPost || null
          }

          setPosts(prev => {
            if (prev.some(p => p.id === postWithQuote.id)) return prev
            return [postWithQuote as unknown as Post, ...prev]
          })
        }
        setNewPostsCount((prev) => prev + 1)
      })
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'posts',
      }, (payload) => {
        const updated = payload.new as any
        setPosts((prev) =>
          prev.map((p) =>
            p.id === updated.id
              ? { ...p, likes_count: updated.likes_count, shares_count: updated.shares_count, comments_count: updated.comments_count } as Post
              : p
          )
        )
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user?.id])

  const loadMore = () => {
    if (!loading && hasMore) {
      const nextPage = page + 1
      setPage(nextPage)
      fetchPosts(nextPage, true)
    }
  }

  useEffect(() => {
    const handleScroll = () => {
      if (
        window.innerHeight + document.documentElement.scrollTop >= document.documentElement.offsetHeight - 500 &&
        hasMore &&
        !loading
      ) {
        loadMore()
      }
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [hasMore, loading])

  const handleLikeChange = (postId: string, isLiked: boolean) => {
    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId ? { ...p, is_liked: isLiked } : p
      )
    )
  }

  const handleShowNewPosts = () => {
    setNewPostsCount(0)
    fetchPosts(0)
  }

  // Deduplicate posts to prevent React duplicate key errors
  const uniquePosts = posts.filter((post, index, self) =>
    index === self.findIndex(p => p.id === post.id)
  )

  return (
    <div>
      {newPostsCount > 0 && (
        <button
          onClick={handleShowNewPosts}
          className="sticky top-[57px] z-20 w-full bg-primary text-white py-2 text-center font-medium hover:bg-primary-hover transition-colors shadow-sm"
        >
          {newPostsCount} new post{newPostsCount > 1 ? 's' : ''}
        </button>
      )}
      {uniquePosts.length === 0 && !loading ? (
        <div className="py-20 text-center">
          <p className="text-gray-500 text-lg">No posts yet</p>
          <p className="text-gray-400 text-sm mt-2">Be the first to share your thoughts!</p>
        </div>
      ) : (
        uniquePosts.map((post, index) => (
          <React.Fragment key={post.id}>
            <PostCard
              post={post}
              currentUserId={user?.id}
              onLikeChange={handleLikeChange}
            />
            {(index + 1) % 5 === 0 && <RandomFeedAd />}
          </React.Fragment>
        ))
      )}
      {loading && (
        page === 0 ? (
          <FeedSkeleton count={3} />
        ) : (
          <div className="py-8 text-center text-gray-500 text-sm animate-pulse">
            Loading more posts...
          </div>
        )
      )}
    </div>
  )
}