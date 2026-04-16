'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Search as SearchIcon, ArrowLeft, Home, Heart, LogOut, User, TrendingUp, Repeat, X, History } from 'lucide-react'
import PostCard from '@/components/PostCard'
import Sidebar from '@/components/Sidebar'
import RightSidebar from '@/components/RightSidebar'
import { FeedSkeleton } from '@/components/Skeleton'
import Navigation from '@/components/Navigation'
import Avatar from '@/components/Avatar'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import AuthGuard from '@/components/AuthGuard'

function SearchContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { user } = useAuthStore()
  
  const queryParam = searchParams.get('q') || ''
  const tagParam = searchParams.get('tag') || ''
  
  const [query, setQuery] = useState(queryParam || (tagParam ? `#${tagParam}` : ''))
  const [posts, setPosts] = useState<any[]>([])
  const [profiles, setProfiles] = useState<any[]>([])
  const [followedIds, setFollowedIds] = useState<Set<string>>(new Set())
  const [recentSearches, setRecentSearches] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState<'top' | 'latest' | 'people'>('latest')
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(true)

  useEffect(() => {
    // Sync local query state with URL params
    if (tagParam) {
      setQuery(`#${tagParam}`)
    } else if (queryParam) {
      setQuery(queryParam)
    }

    if (queryParam || tagParam) {
      setPage(0)
      handleSearch(undefined, 0, false)
    }

    // Load recent searches
    const saved = localStorage.getItem('recent_searches')
    if (saved) {
      try {
        setRecentSearches(JSON.parse(saved))
      } catch (e) {
        console.error('Failed to parse recent searches', e)
      }
    }
  }, [searchParams, activeTab])

  // Real-time search with debounce
  useEffect(() => {
    // Don't search if it was a manual enter or the query matches the current params
    const currentParam = tagParam ? `#${tagParam}` : queryParam
    if (query === currentParam) return

    const timer = setTimeout(() => {
      if (!query.trim()) return
      
      const searchTerm = query.trim()
      if (searchTerm.startsWith('#')) {
        router.push(`/search?tag=${searchTerm.substring(1)}`)
      } else {
        router.push(`/search?q=${encodeURIComponent(searchTerm)}`)
      }
    }, 300)

    return () => clearTimeout(timer)
  }, [query])

  async function handleSearch(e?: React.FormEvent, pageNum: number = 0, append: boolean = false) {
    if (e) e.preventDefault()
    
    // Prioritize search terms from params if this is an automated call (not from form submit)
    const effectiveQuery = e ? query.trim() : (tagParam || queryParam || query.trim())
    if (!effectiveQuery) return

    // Save to recent searches
    if (effectiveQuery.length > 1) {
      setRecentSearches(prev => {
        const next = [effectiveQuery, ...prev.filter(s => s !== effectiveQuery)].slice(0, 10)
        localStorage.setItem('recent_searches', JSON.stringify(next))
        return next
      })
    }

    if (!append) {
      setLoading(true)
      setPage(0)
    }
    
    // Update URL if searched from input
    if (e) {
      const searchTerm = query.trim()
      if (searchTerm.startsWith('#')) {
        router.push(`/search?tag=${searchTerm.substring(1)}`)
      } else {
        router.push(`/search?q=${encodeURIComponent(searchTerm)}`)
      }
      return // URL change will trigger useEffect
    }

    const limit = 10
    const offset = pageNum * limit

    try {
      // Pre-fetch following IDs to allow seeing hidden people we follow
      let allFollowingIds: string[] = []
      if (user) {
        const { data: fData } = await supabase.from('follows').select('following_id').eq('follower_id', user.id)
        allFollowingIds = [user.id, ...(fData?.map(f => f.following_id) || [])]
      }

      if (activeTab === 'people') {
        let profileQuery = supabase
          .from('profiles')
          .select('*')
          .or(`username.ilike.%${effectiveQuery}%,full_name.ilike.%${effectiveQuery}%`)

        if (allFollowingIds.length > 0) {
          const ids = allFollowingIds.map(id => `"${id}"`).join(',')
          profileQuery = profileQuery.or(`hide_from_search.eq.false,id.in.(${ids})`)
        } else {
          profileQuery = profileQuery.eq('hide_from_search', false)
        }

        const { data } = await profileQuery.range(offset, offset + limit - 1)
        const newProfiles = data || []
        
        // Check following status for the current batch
        if (user && newProfiles.length > 0) {
          const batchIds = newProfiles.map(p => p.id)
          const followedInBatch = allFollowingIds.filter(id => batchIds.includes(id))
          const newFollowedSet = new Set(followedInBatch)
          if (append) setFollowedIds(prev => new Set([...Array.from(prev), ...Array.from(newFollowedSet)]))
          else setFollowedIds(newFollowedSet)
        }

        if (append) setProfiles(prev => [...prev, ...newProfiles])
        else setProfiles(newProfiles)
        setPosts([])
        setHasMore(newProfiles.length === limit)
      } else {
        let supabaseQuery = supabase
          .from('posts')
          .select('*, profiles(*)')
          .eq('is_deleted', false)

        if (allFollowingIds.length > 0) {
          const ids = allFollowingIds.map(id => `"${id}"`).join(',')
          // Filter by profile's privacy OR if we follow the author
          supabaseQuery = supabaseQuery.or(`hide_from_search.eq.false,user_id.in.(${ids})`, { foreignTable: 'profiles' })
        } else {
          supabaseQuery = supabaseQuery.filter('profiles.hide_from_search', 'eq', false)
        }

        if (tagParam) {
          const tag = tagParam.toLowerCase()
          // Search for EXACT hashtag match in metadata OR textual #hashtag in content
          // This avoids broader matches like 'yapping' when searching for '#yapp'
          supabaseQuery = supabaseQuery.or(`hashtags.cs.["${tag}"],content.ilike.%#${tag}%`)
        } else if (queryParam) {
          supabaseQuery = supabaseQuery.ilike('content', `%${queryParam}%`)
        }

        if (activeTab === 'latest') {
          supabaseQuery = supabaseQuery.order('created_at', { ascending: false })
        } else {
          supabaseQuery = supabaseQuery.order('likes_count', { ascending: false })
        }

        const { data } = await supabaseQuery.range(offset, offset + limit - 1)
        const newPosts = data || []

        // Fetch quoted posts separately
        const qpIds = newPosts.map((p: any) => p.quoted_post_id).filter(Boolean) as string[]
        if (qpIds.length > 0) {
          const { data: qpData } = await supabase
            .from('posts')
            .select('*, profiles:user_id (id, username, full_name, avatar_url)')
            .in('id', qpIds)
          const qpMap: Record<string, any> = {}
          qpData?.forEach((qp: any) => { qpMap[qp.id] = qp })
          newPosts.forEach((p: any) => {
            if (p.quoted_post_id) p.quoted_post = qpMap[p.quoted_post_id] || null
          })
        }
        
        if (append) setPosts(prev => [...prev, ...newPosts])
        else setPosts(newPosts)
        setProfiles([])
        setHasMore(newPosts.length === limit)
      }
    } catch (error) {
      console.error('Search error:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadMore = () => {
    if (!loading && hasMore) {
      const nextPage = page + 1
      setPage(nextPage)
      handleSearch(undefined, nextPage, true)
    }
  }

  async function handleFollowUser(profileId: string, isCurrentlyFollowing: boolean) {
    if (!user) {
      router.push('/login')
      return
    }

    try {
      if (isCurrentlyFollowing) {
        await supabase.from('follows').delete().eq('follower_id', user.id).eq('following_id', profileId)
        setFollowedIds(prev => {
          const next = new Set(prev)
          next.delete(profileId)
          return next
        })
      } else {
        await supabase.from('follows').insert({ follower_id: user.id, following_id: profileId })
        setFollowedIds(prev => new Set(prev).add(profileId))
      }
    } catch (err) {
      console.error('Error toggling follow:', err)
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
  }, [hasMore, loading, page, query, tagParam, queryParam])

  return (
    <>
      <div className="sticky top-0 bg-white/80 backdrop-blur-md z-20 border-b border-gray-50 p-4">
        <form onSubmit={handleSearch} className="relative flex items-center gap-3">
          <button type="button" onClick={() => router.back()} className="p-2 hover:bg-gray-100 rounded-full">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="relative flex-1">
            <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search KeyYap..."
              className="w-full bg-gray-100 border border-transparent rounded-full py-3 pl-12 pr-4 focus:ring-2 focus:ring-primary focus:border-primary focus:bg-white transition-all text-sm outline-none"
            />
            {query && (
              <button 
                type="button" 
                onClick={() => setQuery('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 bg-gray-400 text-white rounded-full p-0.5"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>
        </form>

        <div className="flex mt-4">
          {(['top', 'latest', 'people'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors capitalize ${
                activeTab === tab ? 'border-primary text-primary font-bold' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      <div className="pb-32">
        {loading && page === 0 ? (
          <FeedSkeleton count={3} />
        ) : (
          <>
            {activeTab === 'people' ? (
              <div className="divide-y divide-gray-100">
                {profiles.length === 0 ? (
                  <div className="p-8 text-center text-gray-500">No people found</div>
                ) : (
                  <>
                    {profiles.map(p => {
                      const isFollowing = followedIds.has(p.id)
                      const isMe = user?.id === p.id

                      return (
                        <div key={p.id} className="p-4 hover:bg-gray-50/50 transition-colors flex items-start gap-3">
                          <Link href={`/u/${p.username}`} className="shrink-0">
                            <Avatar url={p.avatar_url || undefined} username={p.username} size="md" />
                          </Link>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between gap-2">
                              <Link href={`/u/${p.username}`} className="block min-w-0 group">
                                <span className="font-bold text-[15px] text-gray-900 group-hover:underline block truncate">
                                  {p.full_name || p.username}
                                </span>
                                <span className="text-sm text-gray-500 block truncate">@{p.username}</span>
                                {p.bio && <p className="text-sm text-gray-700 mt-1 line-clamp-2">{p.bio}</p>}
                                {isMe && <span className="mt-1 text-[10px] font-bold bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded uppercase tracking-wider">It's You</span>}
                              </Link>
                              
                              {!isMe && (
                                <button
                                  onClick={() => handleFollowUser(p.id, isFollowing)}
                                  className={`shrink-0 px-4 py-1.5 rounded-full text-sm font-bold transition-all ${
                                    isFollowing 
                                      ? 'border border-gray-300 text-gray-700 hover:border-red-200 hover:text-red-500 hover:bg-red-50' 
                                      : 'bg-gray-900 text-white hover:bg-gray-800'
                                  }`}
                                >
                                  {isFollowing ? 'Following' : 'Follow'}
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                    {loading && (
                      <div className="py-8 flex justify-center">
                        <div className="spinner border-primary/20 border-t-primary w-5 h-5" />
                      </div>
                    )}
                  </>
                )}
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {posts.length === 0 ? (
                  <div className="p-8 text-center text-gray-500">
                    {query ? 'No results found' : 'Type something to search'}
                  </div>
                ) : (
                  <>
                    {posts.map(post => (
                      <PostCard key={post.id} post={post} currentUserId={user?.id} />
                    ))}
                    {loading && (
                      <div className="py-8 flex justify-center">
                        <div className="spinner border-primary/20 border-t-primary w-5 h-5" />
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </>
        )}

        {/* Recent Searches */}
        {recentSearches.length > 0 && (
          <div className="mt-8 border-t border-gray-100 divide-y divide-gray-50">
            <div className="px-4 py-4 flex items-center justify-between bg-gray-50/30">
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                <History className="w-3 h-3" />
                Recent Searches
              </h3>
              <button 
                onClick={() => {
                  setRecentSearches([])
                  localStorage.removeItem('recent_searches')
                }}
                className="text-[11px] font-bold text-red-500 hover:underline px-2 py-1"
              >
                Clear all
              </button>
            </div>
            <div className="flex flex-col">
              {recentSearches.map((s, idx) => (
                <div key={idx} className="flex items-center group hover:bg-gray-50 transition-colors">
                  <button
                    onClick={() => {
                      setQuery(s)
                      if (s.startsWith('#')) router.push(`/search?tag=${s.substring(1)}`)
                      else router.push(`/search?q=${encodeURIComponent(s)}`)
                    }}
                    className="flex-1 px-4 py-3 text-left text-[15px] font-medium text-gray-700 flex items-center gap-3"
                  >
                    <SearchIcon className="w-4 h-4 text-gray-300 group-hover:text-primary transition-colors" />
                    <span className="truncate">{s}</span>
                  </button>
                  <button 
                    onClick={() => {
                      const next = recentSearches.filter((_, i) => i !== idx)
                      setRecentSearches(next)
                      localStorage.setItem('recent_searches', JSON.stringify(next))
                    }}
                    className="p-3 mr-1 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-full transition-all"
                    title="Remove"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  )
}

export default function SearchPage() {
  return (
    <AuthGuard>
      <div className="min-h-screen bg-white">
        <Sidebar />
        <div className="lg:ml-[68px] xl:ml-[275px] flex justify-center">
          <div className="flex w-full max-w-[1050px] items-start">
            <main className="flex-1 max-w-2xl border-x border-gray-100 min-h-screen">
              <Suspense fallback={<FeedSkeleton count={3} />}>
                <SearchContent />
              </Suspense>
            </main>
            <RightSidebar hideSearch={true} />
          </div>
        </div>
        <div className="lg:hidden">
          <Navigation />
        </div>
      </div>
    </AuthGuard>
  )
}