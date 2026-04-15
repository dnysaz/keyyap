'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, UserPlus, UserMinus } from 'lucide-react'
import Link from 'next/link'
import Sidebar from '@/components/Sidebar'
import RightSidebar from '@/components/RightSidebar'
import Navigation from '@/components/Navigation'
import Avatar from '@/components/Avatar'
import { UserListSkeleton } from '@/components/Skeleton'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'

interface FollowerUser {
  id: string
  username: string
  full_name: string
  avatar_url: string
  bio: string
  is_following_back?: boolean
}

export default function FollowersPage({ params }: { params: Promise<{ username: string }> }) {
  const router = useRouter()
  const { username } = use(params)
  const { user: currentUser } = useAuthStore()
  
  const [profile, setProfile] = useState<any>(null)
  const [users, setUsers] = useState<FollowerUser[]>([])
  const [loading, setLoading] = useState(true)
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set())

  // Fetch target profile and followers
  useEffect(() => {
    async function fetchData() {
      if (!username) return
      setLoading(true)

      // 1. Get the profile of the user we're looking at
      const { data: targetProfile } = await supabase
        .from('profiles')
        .select('id, username, full_name')
        .eq('username', username)
        .single()

      if (!targetProfile) {
        router.push('/')
        return
      }
      setProfile(targetProfile)

      // 2. Get followers
      const { data: followersData, error } = await supabase
        .from('follows')
        .select(`
          follower:profiles!follows_follower_id_fkey (
            id,
            username,
            full_name,
            avatar_url,
            bio
          )
        `)
        .eq('following_id', targetProfile.id)

      if (followersData) {
        let mappedUsers = followersData.map((f: any) => f.follower)
        
        // 3. If logged in, check which ones follow ME
        if (currentUser) {
          const { data: myFollowers } = await supabase
            .from('follows')
            .select('follower_id')
            .eq('following_id', currentUser.id)
            .in('follower_id', mappedUsers.map(u => u.id))
          
          const myFollowersSet = new Set(myFollowers?.map(f => f.follower_id) || [])
          mappedUsers = mappedUsers.map(u => ({
            ...u,
            follows_me: myFollowersSet.has(u.id)
          }))

          const { data: myFollowing } = await supabase
            .from('follows')
            .select('following_id')
            .eq('follower_id', currentUser.id)
          
          if (myFollowing) {
            setFollowingIds(new Set(myFollowing.map(f => f.following_id)))
          }
        }
        setUsers(mappedUsers)
      }

      setLoading(false)
    }

    fetchData()
  }, [username, currentUser])

  const handleFollowToggle = async (targetUserId: string) => {
    if (!currentUser) {
      router.push('/login')
      return
    }

    const isFollowing = followingIds.has(targetUserId)

    if (isFollowing) {
      // Unfollow
      const { error } = await supabase
        .from('follows')
        .delete()
        .eq('follower_id', currentUser.id)
        .eq('following_id', targetUserId)

      if (!error) {
        const newIds = new Set(followingIds)
        newIds.delete(targetUserId)
        setFollowingIds(newIds)
      }
    } else {
      // Follow
      const { error } = await supabase
        .from('follows')
        .insert({
          follower_id: currentUser.id,
          following_id: targetUserId
        })

      if (!error) {
        const newIds = new Set(followingIds)
        newIds.add(targetUserId)
        setFollowingIds(newIds)
      }
    }
  }

  return (
    <div className="min-h-screen bg-white">
      <Sidebar />
      <div className="lg:ml-[68px] xl:ml-[275px] flex justify-center">
        <div className="flex w-full max-w-[1050px]">
          <main className="flex-1 max-w-2xl border-x border-gray-100 min-h-screen">
            {/* Header */}
            <div className="sticky top-0 bg-white/80 backdrop-blur-md z-10 px-4 py-2 border-b border-gray-50">
              <div className="flex items-center gap-6">
                <button onClick={() => router.back()} className="p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors">
                  <ArrowLeft className="w-5 h-5 text-gray-800" />
                </button>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">{profile?.full_name || username}</h1>
                  <p className="text-xs text-gray-500">@{username}</p>
                </div>
              </div>
              {/* Tabs */}
              <div className="flex mt-2">
                <Link href={`/u/${username}/followers`} className="flex-1 py-3 text-center border-b-2 border-primary font-bold text-sm">
                  Followers
                </Link>
                <Link href={`/u/${username}/following`} className="flex-1 py-3 text-center border-b-2 border-transparent hover:bg-gray-50 text-gray-500 font-medium text-sm transition-colors">
                  Following
                </Link>
              </div>
            </div>

            {/* List */}
            <div className="divide-y divide-gray-50">
              {loading ? (
                <UserListSkeleton count={6} />
              ) : users.length === 0 ? (
                <div className="p-12 text-center">
                  <h3 className="text-xl font-bold text-gray-900 mb-2">No followers yet</h3>
                  <p className="text-gray-500">When someone follows @{username}, they'll show up here.</p>
                </div>
              ) : (
                users.map(u => (
                  <div key={u.id} className="p-4 hover:bg-gray-50/50 transition-colors flex items-start gap-3 group">
                    <Link href={`/u/${u.username}`}>
                      <Avatar url={u.avatar_url || undefined} username={u.username} size="md" />
                    </Link>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <Link href={`/u/${u.username}`} className="min-w-0">
                          <p className="font-bold text-gray-900 hover:underline truncate">{u.full_name}</p>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <p className="text-gray-500 text-sm truncate">@{u.username}</p>
                            {(u as any).follows_me && (
                              <span className="bg-gray-100 text-[#536471] text-[11px] px-1.5 py-0.5 rounded-[4px] font-bold">Follows you</span>
                            )}
                          </div>
                        </Link>
                        {currentUser?.id !== u.id && (
                          <button
                            onClick={() => handleFollowToggle(u.id)}
                            className={`px-4 py-1.5 rounded-full text-sm font-bold transition-all ${
                              followingIds.has(u.id)
                                ? 'border border-gray-200 hover:border-red-200 hover:bg-red-50 hover:text-red-600'
                                : 'bg-gray-900 text-white hover:bg-black shadow-sm'
                            }`}
                          >
                            {followingIds.has(u.id) ? 'Following' : 'Follow'}
                          </button>
                        )}
                      </div>
                      {u.bio && (
                        <p className="mt-1 text-sm text-gray-700 line-clamp-2">{u.bio}</p>
                      )}
                    </div>
                  </div>
                ))
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
  )
}
