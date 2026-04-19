'use client'

import { Globe, Search, PencilLine, Bell, User } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import Avatar from './Avatar'
import { useAuthStore } from '@/stores/authStore'
import { useNotificationStore } from '@/stores/notificationStore'

export default function Navigation() {
  const pathname = usePathname()
  const { user, profile } = useAuthStore()
  const { unreadCount } = useNotificationStore()

  const isActive = (path: string) => pathname === path

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 pb-safe">
      <div className="flex items-center justify-around h-[76px] pb-4 max-w-lg mx-auto">
        <Link href="/" className={isActive('/') ? 'text-gray-900' : 'text-gray-500'}>
          <Globe className="w-7 h-7" />
        </Link>
        <Link href="/search" className={isActive('/search') ? 'text-gray-900' : 'text-gray-500'}>
          <Search className="w-7 h-7" />
        </Link>
        <Link href="/create">
          <PencilLine className="w-7 h-7 text-gray-500" />
        </Link>
        <Link href="/notifications" className={`relative ${isActive('/notifications') ? 'text-gray-900' : 'text-gray-500'}`}>
          <Bell className="w-7 h-7" />
          {unreadCount > 0 && (
            <div className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] bg-primary text-white text-[10px] font-bold rounded-full border-2 border-white flex items-center justify-center px-1 animate-in zoom-in duration-200">
              {unreadCount > 99 ? '99+' : unreadCount}
            </div>
          )}
        </Link>
        <Link href={user ? `/u/${profile?.username || 'me'}` : '/login'} className={isActive('/login') ? 'text-gray-900 font-bold' : 'text-gray-500'}>
          {user ? (
            <div className={`rounded-full border-[1.5px] p-[1px] ${isActive(`/u/${profile?.username}`) ? 'border-gray-900 text-gray-900' : 'border-transparent text-gray-500'}`}>
              <Avatar url={profile?.avatar_url || undefined} username={profile?.username || undefined} size="xs" className="w-[26px] h-[26px] text-xs" />
            </div>
          ) : (
            <User className="w-7 h-7" />
          )}
        </Link>
      </div>
    </nav>
  )
}