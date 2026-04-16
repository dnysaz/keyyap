import { create } from 'zustand'
import { supabase } from '@/lib/supabase'
import { Post } from '@/types'

interface PostState {
  posts: Post[]
  trendingTags: any[]
  loading: boolean
  hasFetched: boolean
  setPosts: (posts: Post[]) => void
  fetchPosts: (isGlobal?: boolean, userId?: string) => Promise<void>
  fetchTrending: () => Promise<void>
  addPost: (post: Post) => void
  updatePostCounter: (postId: string, type: 'likes' | 'shares' | 'comments', count: number) => void
}

export const usePostStore = create<PostState>((set, get) => ({
  posts: [],
  trendingTags: [],
  loading: false,
  hasFetched: false,

  setPosts: (posts) => set({ posts }),

  fetchTrending: async () => {
    if (get().trendingTags.length > 0) return 
    
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    const { data } = await supabase
      .from('posts')
      .select('hashtags')
      .gte('created_at', since.toISOString())
      .eq('is_deleted', false)
      .not('hashtags', 'is', null)
      .limit(100)

    const hashtagCounts = new Map<string, number>()
    data?.forEach(post => {
      const tags = post.hashtags as string[]
      if (Array.isArray(tags)) {
        const unique = new Set(tags.map(t => t.toLowerCase().replace(/[^a-z0-9_]/g, '')))
        unique.forEach(tag => tag && hashtagCounts.set(tag, (hashtagCounts.get(tag) || 0) + 1))
      }
    })

    const sorted = Array.from(hashtagCounts.entries())
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5)

    set({ trendingTags: sorted })
  },

  fetchPosts: async (isGlobal = false, userId) => {
    if (get().posts.length === 0) set({ loading: true })

    const { data, error } = await supabase
      .from('posts')
      .select(`
        *,
        profiles:user_id (id, username, full_name, avatar_url)
      `)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })
      .limit(30)

    if (!error && data) {
      let processedPosts = data as Post[]
      if (userId) {
        const { data: likes } = await supabase
          .from('post_likes')
          .select('post_id')
          .eq('user_id', userId)
          .in('post_id', data.map(p => p.id))
        
        const likedSet = new Set(likes?.map(l => l.post_id) || [])
        processedPosts = data.map(p => ({
          ...p,
          is_liked: likedSet.has(p.id)
        })) as Post[]
      }

      set({ 
        posts: processedPosts, 
        loading: false, 
        hasFetched: true 
      })
    } else {
      set({ loading: false })
    }
  },

  addPost: (post) => set((state) => ({ posts: [post, ...state.posts] })),

  updatePostCounter: (postId, type, count) => set((state) => ({
    posts: state.posts.map(p => {
      if (p.id === postId) {
        if (type === 'likes') return { ...p, likes_count: count } as Post
        if (type === 'shares') return { ...p, shares_count: count } as Post
        if (type === 'comments') return { ...p, comments_count: count } as Post
      }
      return p
    })
  }))
}))
