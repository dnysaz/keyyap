'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Home, Search, Heart, LogOut, User, Bell, MessageCircle, Repeat, ArrowLeft, Eye, X } from 'lucide-react'
import Sidebar from '@/components/Sidebar'
import RightSidebar from '@/components/RightSidebar'
import Navigation from '@/components/Navigation'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import { useNotificationStore } from '@/stores/notificationStore'
import AuthGuard from '@/components/AuthGuard'
import { NotificationSkeleton } from '@/components/Skeleton'

export default function NotificationsPage() {
  const router = useRouter()
  const { user, profile } = useAuthStore()
  const { resetUnreadCount } = useNotificationStore()
  const [notifications, setNotifications] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(true)

  useEffect(() => {
    if (user) {
      fetchNotifications(0)
      markAllAsRead()
    }
  }, [user])

  async function fetchNotifications(pageNum: number = 0, append: boolean = false) {
    if (!append) setLoading(true)
    const limit = 20
    const offset = pageNum * limit

    const { data, error } = await supabase
      .from('notifications')
      .select(`
        *,
        from_profile:from_user_id (username, full_name, avatar_url),
        post:post_id (content, id)
      `)
      .eq('user_id', user?.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    if (error) {
      console.error('Error fetching notifications:', error)
    } else {
      const newNotifs = data || []
      if (append) setNotifications(prev => [...prev, ...newNotifs])
      else setNotifications(newNotifs)
      setHasMore(newNotifs.length === limit)
    }
    setLoading(false)
  }

  const observerTarget = useRef<HTMLDivElement>(null)

  const loadMore = () => {
    if (!loading && hasMore) {
      const nextPage = page + 1
      setPage(nextPage)
      fetchNotifications(nextPage, true)
    }
  }

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loading) {
          loadMore()
        }
      },
      { threshold: 0.1 }
    )

    if (observerTarget.current) {
      observer.observe(observerTarget.current)
    }

    return () => observer.disconnect()
  }, [hasMore, loading, page])

  async function markAllAsRead() {
    if (!user) return
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', user.id)
      .eq('is_read', false)
    
    if (!error) {
      resetUnreadCount()
    }
  }

  async function deleteNotification(id: string) {
    const { error } = await supabase
      .from('notifications')
      .delete()
      .eq('id', id)

    if (!error) {
      setNotifications(prev => prev.filter(n => n.id !== id))
    }
  }

  function formatDate(date: string) {
    const d = new Date(date)
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  return (
    <AuthGuard>
      <div className="min-h-screen bg-white">
        <Sidebar />
        <div className="lg:ml-[72px] xl:ml-[260px] flex justify-center">
          <div className="flex w-full max-w-[1050px]">
            <main className="flex-1 max-w-2xl border-x border-gray-100 min-h-screen min-w-0">
              <div className="sticky top-0 bg-white/80 backdrop-blur-md z-10 px-4 py-3 border-b border-gray-50 flex items-center justify-between">
                <button onClick={() => router.back()} className="text-gray-500 hover:bg-gray-100 p-2 rounded-full transition-colors flex shrink-0">
                  <X className="w-6 h-6" />
                </button>
                <h1 className="text-lg font-bold">Notifications</h1>
                <div className="w-10" />
              </div>

              <div className="pb-16">
                {loading && page === 0 ? (
                  <NotificationSkeleton count={8} />
                ) : notifications.length === 0 ? (
                  <div className="p-8 text-center text-gray-500">
                    <Bell className="w-12 h-12 mx-auto mb-4 opacity-20" />
                    <p className="text-lg font-medium">No notifications yet</p>
                    <p className="text-sm">When people interact with you, you'll see it here.</p>
                  </div>
                ) : (
                  <>
                    <div className="divide-y divide-gray-100">
                      {notifications.map((notif) => (
                        <div key={notif.id} className={`p-4 flex gap-3 hover:bg-gray-50 transition-colors ${!notif.is_read ? 'bg-primary/5' : ''}`}>
                          <div className="shrink-0 mt-1">
                            {notif.type === 'like' && <Heart className="w-6 h-6 text-red-500 fill-current" />}
                            {notif.type === 'comment' && <MessageCircle className="w-6 h-6 text-primary" />}
                            {notif.type === 'repost' && <Repeat className="w-6 h-6 text-green-500" />}
                            {notif.type === 'follow' && <User className="w-6 h-6 text-primary" />}
                            {notif.type === 'visit' && <Eye className="w-6 h-6 text-gray-400" />}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-1">
                              <div className="flex items-center gap-1.5 min-w-0">
                                <Link href={`/u/${notif.from_profile?.username}`} className="font-bold text-[14px] hover:underline truncate">
                                  {notif.from_profile?.full_name || notif.from_profile?.username}
                                </Link>
                                <span className="text-gray-500 text-[13px] truncate">@{notif.from_profile?.username}</span>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <span className="text-[11px] text-gray-400">{formatDate(notif.created_at)}</span>
                                <button
                                  onClick={(e) => {
                                    e.preventDefault()
                                    e.stopPropagation()
                                    deleteNotification(notif.id)
                                  }}
                                  className="p-1 hover:bg-gray-200 rounded-full text-gray-400 hover:text-gray-600 transition-colors"
                                  title="Delete notification"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                            <p className="text-gray-900 text-[14px]">
                              {notif.type === 'like' && 'Liked your post'}
                              {notif.type === 'comment' && 'Commented on your post'}
                              {notif.type === 'repost' && 'Reposted your post'}
                              {notif.type === 'follow' && 'Started following you'}
                              {notif.type === 'visit' && 'Visited your profile'}
                            </p>
                            {notif.post && (
                              <Link 
                                href={`/u/${profile?.username}/${notif.post.content.split(/\s+/).slice(0, 5).join('-').toLowerCase().replace(/[^a-z0-9-]/g, '')}-${notif.post.id.substring(0, 6)}`}
                                className="text-sm text-gray-500 mt-1 line-clamp-2 block hover:text-gray-700"
                              >
                                {notif.post.content}
                              </Link>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                    {/* Invisible div for Intersection Observer */}
                    <div ref={observerTarget} className="h-4" />
                    {loading && hasMore && (
                      <NotificationSkeleton count={3} />
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