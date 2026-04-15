'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Calendar, MapPin, Link as LinkIcon, Settings, Home, Search, Heart, TrendingUp, Repeat, MessageCircle } from 'lucide-react'
import PostCard from '@/components/PostCard'
import Sidebar from '@/components/Sidebar'
import RightSidebar from '@/components/RightSidebar'
import { FeedSkeleton } from '@/components/Skeleton'
import Navigation from '@/components/Navigation'
import Avatar from '@/components/Avatar'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import AuthGuard from '@/components/AuthGuard'

export default function ProfilePage() {
  const params = useParams()
  const router = useRouter()
  const username = params.username as string
  const { user, profile: currentProfile } = useAuthStore()

  const [profile, setProfile] = useState<any>(null)
  const [posts, setPosts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isFollowing, setIsFollowing] = useState(false)
  const [followersCount, setFollowersCount] = useState(0)
  const [followingCount, setFollowingCount] = useState(0)
  const [activeTab, setActiveTab] = useState<'posts' | 'replies' | 'likes'>('posts')
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(true)

  useEffect(() => {
    if (username) {
      setPage(0)
      fetchProfile(0, false)
    }
  }, [username, activeTab])

  async function fetchProfile(pageNum: number = 0, append: boolean = false) {
    if (!append) setLoading(true)
    const limit = 10
    const offset = pageNum * limit

    try {
      // 1. Fetch user profile (only once per username change)
      if (!profile || profile.username !== username) {
        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('username', username)
          .single()

        if (profileError || !profileData) {
          setLoading(false)
          return
        }
        setProfile(profileData)

        // 2. Fetch stats
        const [followers, following] = await Promise.all([
          supabase.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', profileData.id),
          supabase.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', profileData.id)
        ])
        setFollowersCount(followers.count || 0)
        setFollowingCount(following.count || 0)

        // 3. Check if current user follows this profile
        if (user && user.id !== profileData.id) {
          const { data: followStatus } = await supabase
            .from('follows')
            .select('*')
            .eq('follower_id', user.id)
            .eq('following_id', profileData.id)
            .maybeSingle()
          setIsFollowing(!!followStatus)

          // 4. Record profile visit notification (throttled to once per 24h)
          try {
            const { data: lastVisit } = await supabase
              .from('notifications')
              .select('created_at')
              .eq('user_id', profileData.id)
              .eq('from_user_id', user.id)
              .eq('type', 'visit')
              .gt('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
              .maybeSingle()

            if (!lastVisit) {
              await supabase.from('notifications').insert({
                user_id: profileData.id,
                from_user_id: user.id,
                type: 'visit'
              })
            }
          } catch (e) {
            console.error('Error recording profile visit:', e)
          }
        }
      }

      const targetProfileId = profile?.id || (await supabase.from('profiles').select('id').eq('username', username).single()).data?.id
      if (!targetProfileId) return

      let fetchedData: any[] = []
      let rawLength = 0
      
      if (activeTab === 'posts') {
        const { data } = await supabase
          .from('posts')
          .select('*, profiles(*)')
          .eq('user_id', targetProfileId)
          .eq('is_deleted', false)
          .order('created_at', { ascending: false })
          .range(offset, offset + limit - 1)
        
        // Fetch quoted posts separately (self-referencing JOINs fail with Supabase RLS)
        const qpIds = (data || []).map((p: any) => p.quoted_post_id).filter(Boolean) as string[]
        if (qpIds.length > 0) {
          const { data: qpData } = await supabase
            .from('posts')
            .select('*, profiles:user_id (id, username, full_name, avatar_url)')
            .in('id', qpIds)
          const qpMap: Record<string, any> = {}
          qpData?.forEach((qp: any) => { qpMap[qp.id] = qp })
          data?.forEach((p: any) => {
            if (p.quoted_post_id) p.quoted_post = qpMap[p.quoted_post_id] || null
          })
        }

        fetchedData = data || []
        rawLength = fetchedData.length
      } else if (activeTab === 'likes') {
        const { data: likesData } = await supabase
          .from('post_likes')
          .select('post_id, posts(*, profiles(*))')
          .eq('user_id', targetProfileId)
          .order('created_at', { ascending: false })
          .range(offset, offset + limit - 1)
        
        rawLength = likesData?.length || 0
        fetchedData = (likesData || [])
          .map(l => {
            const post = Array.isArray(l.posts) ? l.posts[0] : l.posts
            return post
          })
          .filter(p => p && !p.is_deleted)
      } else if (activeTab === 'replies') {
        const { data: commentsData } = await supabase
          .from('comments')
          .select('*, posts(*, profiles(*))')
          .eq('user_id', targetProfileId)
          .eq('is_deleted', false)
          .order('created_at', { ascending: false })
          .range(offset, offset + limit - 1)
        
        fetchedData = commentsData || []
        rawLength = fetchedData.length
      }

      // Update like status for current viewer for Post objects
      if (user && fetchedData.length > 0) {
        const postIds = activeTab === 'replies' 
          ? fetchedData.map(c => c.posts?.id).filter(Boolean)
          : fetchedData.map(p => p.id)
          
        if (postIds.length > 0) {
          const { data: userLikes } = await supabase.from('post_likes').select('post_id').eq('user_id', user.id).in('post_id', postIds)
          const likedSet = new Set(userLikes?.map(l => l.post_id) || [])
          
          if (activeTab === 'replies') {
            fetchedData.forEach(c => {
              if (c.posts) c.posts.is_liked = likedSet.has(c.posts.id)
            })
          } else {
            fetchedData.forEach(p => p.is_liked = likedSet.has(p.id))
          }
        }
      }

      if (append) setPosts(prev => [...prev, ...fetchedData])
      else setPosts(fetchedData)

      setHasMore(rawLength === limit)
    } catch (error) {
      console.error('Error fetching profile:', error)
    } finally {
      setLoading(true) 
      setLoading(false)
    }
  }

  const loadMore = () => {
    if (!loading && hasMore) {
      const nextPage = page + 1
      setPage(nextPage)
      fetchProfile(nextPage, true)
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

  async function handleFollow() {
    if (!user || !profile) return

    if (isFollowing) {
      await supabase.from('follows').delete().eq('follower_id', user.id).eq('following_id', profile.id)
      setIsFollowing(false)
      setFollowersCount(prev => prev - 1)
    } else {
      await supabase.from('follows').insert({ follower_id: user.id, following_id: profile.id })
      setIsFollowing(true)
      setFollowersCount(prev => prev + 1)
      
      // Notify
      await supabase.from('notifications').insert({
        type: 'follow',
        user_id: profile.id,
        from_user_id: user.id
      })
    }
  }

  if (loading && !profile) {
    return (
      <div className="min-h-screen bg-white">
        <Sidebar />
        <div className="lg:ml-[72px] xl:ml-[260px] flex justify-center">
          <div className="flex w-full max-w-[1050px] items-start">
             <main className="flex-1 max-w-2xl border-x border-gray-100 min-h-screen">
                <FeedSkeleton count={3} />
             </main>
             <RightSidebar />
          </div>
        </div>
      </div>
    )
  }

  if (!profile) {
    return <div className="p-8 text-center">User not found</div>
  }

  const isOwnProfile = user?.id === profile.id

  return (
    <AuthGuard>
      <div className="min-h-screen bg-white">
        <Sidebar />
        <div className="lg:ml-[72px] xl:ml-[260px] flex justify-center min-w-0">
          <div className="flex w-full max-w-[1050px] min-w-0 items-start">
            <main className="flex-1 max-w-2xl w-full border-x border-gray-100 min-h-screen min-w-0">
              {/* Header */}
              <div className="sticky top-0 bg-white/90 backdrop-blur-md z-30 px-4 py-3 border-b border-gray-50 flex items-center gap-6">
                <button onClick={() => router.back()} className="p-2 hover:bg-gray-100 rounded-full">
                  <ArrowLeft className="w-5 h-5 font-bold" />
                </button>
                <div>
                  <h2 className="font-bold text-lg leading-tight">{profile.full_name || profile.username}</h2>
                  <p className="text-xs text-gray-500">{posts.length} posts</p>
                </div>
              </div>

              {/* Banner & Avatar */}
              <div className="relative">
                <div className="h-32 bg-gray-200 xl:h-48">
                  {profile.banner_url && <img src={profile.banner_url} className="w-full h-full object-cover" alt="" />}
                </div>
                <div className="absolute -bottom-12 left-4 xl:-bottom-16 xl:left-6">
                  <div className="rounded-full border-4 border-white bg-white overflow-hidden shadow-sm">
                    <Avatar url={profile.avatar_url || undefined} username={profile.username} size="lg" />
                  </div>
                </div>
                <div className="flex justify-end p-4">
                  {isOwnProfile ? (
                    <Link href="/settings/profile" className="px-4 py-2 rounded-full border border-gray-300 font-bold hover:bg-gray-100 transition-colors text-sm">
                      Edit Profile
                    </Link>
                  ) : user ? (
                    <button
                      onClick={handleFollow}
                      className={`px-6 py-2 rounded-full font-bold transition-colors text-sm ${
                        isFollowing ? 'border border-gray-300 hover:border-red-500 hover:text-red-500 hover:bg-red-50' : 'bg-gray-900 text-white hover:bg-gray-800'
                      }`}
                    >
                      {isFollowing ? 'Following' : 'Follow'}
                    </button>
                  ) : (
                    <Link href="/login" className="px-6 py-2 rounded-full bg-gray-900 text-white font-bold hover:bg-gray-800 text-sm">
                      Follow
                    </Link>
                  )}
                </div>
              </div>

              {/* Profile Info */}
              <div className="mt-12 xl:mt-16 px-4 xl:px-6">
                <h1 className="font-extrabold text-xl xl:text-2xl text-gray-900">{profile.full_name || profile.username}</h1>
                <p className="text-gray-500">@{profile.username}</p>
                
                {profile.bio && <p className="mt-3 text-gray-800 whitespace-pre-wrap">{profile.bio}</p>}
                
                <div className="flex flex-wrap gap-x-4 gap-y-2 mt-3 text-gray-500 text-sm">
                  {profile.location && (
                    <span className="flex items-center gap-1"><MapPin className="w-4 h-4" /> {profile.location}</span>
                  )}
                  {profile.website && (
                    <a href={profile.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-primary hover:underline">
                      <LinkIcon className="w-4 h-4" /> {profile.website.replace(/^https?:\/\//, '')}
                    </a>
                  )}
                  <span className="flex items-center gap-1"><Calendar className="w-4 h-4" /> Joined {new Date(profile.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</span>
                </div>
                
                <div className="flex gap-4 mt-4">
                  <Link href={`/u/${username}/following`} className="hover:underline flex gap-1 items-center">
                    <span className="font-bold text-gray-900">{followingCount}</span>
                    <span className="text-gray-500">Following</span>
                  </Link>
                  <Link href={`/u/${username}/followers`} className="hover:underline flex gap-1 items-center">
                    <span className="font-bold text-gray-900">{followersCount}</span>
                    <span className="text-gray-500">Followers</span>
                  </Link>
                </div>
              </div>

              {/* Tabs */}
              <div className="flex border-b border-gray-100 mt-4 overflow-x-auto no-scrollbar">
                {(['posts', 'replies', 'likes'] as const)
                  .filter(tab => tab !== 'likes' || isOwnProfile)
                  .map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={`flex-1 min-w-[100px] py-4 text-center text-sm font-medium transition-colors capitalize ${
                        activeTab === tab ? 'text-gray-900 font-bold border-b-2 border-primary' : 'text-gray-500 hover:bg-gray-50'
                      }`}
                    >
                      {tab}
                    </button>
                  ))}
              </div>

              {/* Content */}
              <div className="pb-32">
                {loading && page === 0 ? (
                  <FeedSkeleton count={3} />
                ) : posts.length === 0 ? (
                  <div className="p-12 text-center text-gray-500">
                    No posts yet
                  </div>
                ) : (
                  <>
                    <div className="divide-y divide-gray-100">
                      {posts.map((item, idx) => {
                        if (activeTab === 'replies') {
                          // item is a Comment
                          const comment = item
                          const post = comment.posts
                          if (!post) return null
                          
                          return (
                            <div key={comment.id} className="hover:bg-gray-50/30 transition-colors border-b border-gray-100 last:border-0">
                              <div className="px-4 py-2 bg-gray-50/50 border-b border-gray-100 flex items-center gap-2">
                                <MessageCircle className="w-3 h-3 text-gray-400" />
                                <span className="text-xs text-gray-500">
                                  Replying to <span className="font-bold text-gray-700">@{post.profiles?.username}</span>
                                </span>
                              </div>
                              <div className="p-4">
                                <div className="flex gap-3">
                                  <Link href={`/u/${post.profiles?.username}`} className="shrink-0">
                                    <Avatar url={post.profiles?.avatar_url || undefined} username={post.profiles?.username} size="md" />
                                  </Link>
                                  <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-1 text-sm text-gray-500">
                                      <span className="font-bold text-gray-900">{post.profiles?.full_name || post.profiles?.username}</span>
                                      <span>·</span>
                                      <span>{new Date(post.created_at).toLocaleDateString()}</span>
                                    </div>
                                    <p className="text-gray-600 text-sm mt-1 line-clamp-2 italic">"{post.content}"</p>
                                    
                                    <div className="mt-3 pl-4 border-l-2 border-primary/30 py-1">
                                      <p className="text-gray-900 text-base">{comment.content}</p>
                                    </div>
                                    
                                    <Link 
                                      href={`/u/${post.profiles?.username}/${post.content.replace(/[*_`]/g, '').split(/\s+/).slice(0, 5).join('-').toLowerCase().replace(/[^a-z0-9-]/g, '') || 'post'}-${post.id.substring(0, 6)}`}
                                      className="mt-3 inline-flex items-center text-xs text-primary font-bold hover:underline"
                                    >
                                      View full conversation
                                    </Link>
                                  </div>
                                </div>
                              </div>
                            </div>
                          )
                        }
                        if (activeTab === 'likes') {
                          return (
                            <div key={item.id} className="group">
                              <div className="px-4 py-2 bg-gray-50/50 border-b border-gray-100 flex items-center gap-2">
                                <Heart className="w-3 h-3 text-red-500 fill-current" />
                                <span className="text-xs font-bold text-gray-500">You liked this post</span>
                              </div>
                              <PostCard post={item} currentUserId={user?.id} />
                            </div>
                          )
                        }
                        
                        // item is a Post
                        return <PostCard key={item.id} post={item} currentUserId={user?.id} />
                      })}
                    </div>
                    {loading && (
                      <div className="py-8 text-center text-gray-500 text-sm animate-pulse">
                        Loading more content...
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