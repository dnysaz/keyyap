'use client'

import { useEffect, useRef } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Heart, Bell, MessageCircle, Repeat, Eye, X, User } from 'lucide-react'
import Sidebar from '@/components/Sidebar'
import RightSidebar from '@/components/RightSidebar'
import Navigation from '@/components/Navigation'
import { useAuthStore } from '@/stores/authStore'
import { useNotificationStore } from '@/stores/notificationStore'
import AuthGuard from '@/components/AuthGuard'
import { NotificationSkeleton } from '@/components/Skeleton'

export default function NotificationsPage() {
  const router = useRouter()
  const { user, profile } = useAuthStore()
  const { 
    notifications, 
    loading, 
    fetchNotifications, 
    markAllAsRead,
    hasFetched 
  } = useNotificationStore()

  useEffect(() => {
    if (user?.id) {
      if (!hasFetched) {
        fetchNotifications(user.id)
      }
      markAllAsRead(user.id)
    }
  }, [user?.id, fetchNotifications, markAllAsRead, hasFetched])

  function formatDate(date: string) {
    const d = new Date(date)
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  // Helper for slug generation
  const getPostSlug = (notif: any) => {
    if (!notif.post) return '#'
    const content = notif.post.content || 'post'
    const cleanContent = content.split(/\s+/).slice(0, 5).join('-').toLowerCase().replace(/[^a-z0-9-]/g, '')
    return `/u/${profile?.username}/${cleanContent}-${notif.post.id.substring(0, 6)}`
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
                {/* 
                  If we have notifications already, don't show the skeleton at all! 
                  This is what makes it "instan".
                */}
                {loading && notifications.length === 0 ? (
                  <NotificationSkeleton count={8} />
                ) : notifications.length === 0 ? (
                  <div className="p-8 text-center text-gray-500">
                    <Bell className="w-12 h-12 mx-auto mb-4 opacity-20" />
                    <p className="text-lg font-medium">No notifications yet</p>
                    <p className="text-sm">When people interact with you, you'll see it here.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100 animate-in fade-in duration-300">
                    {notifications.map((notif) => (
                      <div key={notif.id} className={`p-4 flex gap-3 hover:bg-gray-50 transition-colors ${!notif.is_read ? 'bg-primary/5 border-l-2 border-primary' : ''}`}>
                        <div className="shrink-0 mt-1">
                          {notif.type === 'like' && <Heart className="w-6 h-6 text-red-500 fill-current" />}
                          {notif.type === 'comment' && <MessageCircle className="w-6 h-6 text-primary" />}
                          {notif.type === 'repost' && <Repeat className="w-6 h-6 text-green-500" />}
                          {notif.type === 'follow' && <User className="w-6 h-6 text-primary" />}
                          {notif.type === 'visit' && <Eye className="w-6 h-6 text-gray-400" />}
                          {notif.type === 'mention' && <MessageCircle className="w-6 h-6 text-accent" />}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <Link href={`/u/${notif.from_profile?.username}`} className="font-bold text-[14px] hover:underline truncate">
                                {notif.from_profile?.full_name || notif.from_profile?.username}
                              </Link>
                              <span className="text-gray-500 text-[13px] truncate">@{notif.from_profile?.username}</span>
                            </div>
                            <span className="text-[11px] text-gray-400 shrink-0">{formatDate(notif.created_at)}</span>
                          </div>
                          <p className="text-gray-900 text-[14px]">
                            {notif.type === 'like' && 'Liked your post'}
                            {notif.type === 'comment' && 'Commented on your post'}
                            {notif.type === 'repost' && 'Reposted your post'}
                            {notif.type === 'follow' && 'Started following you'}
                            {notif.type === 'visit' && 'Visited your profile'}
                            {notif.type === 'mention' && 'Mentioned you in a post'}
                          </p>
                          {notif.post && (
                            <Link 
                              href={getPostSlug(notif)}
                              className="text-sm text-gray-500 mt-1 line-clamp-2 block hover:text-gray-700 italic border-l-2 border-gray-100 pl-3 py-1"
                            >
                              {notif.post.content}
                            </Link>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
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