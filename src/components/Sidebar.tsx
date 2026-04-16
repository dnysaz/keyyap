'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Home, Search, Bell, TrendingUp, Repeat, LogOut, User, PenSquare } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import { useNotificationStore } from '@/stores/notificationStore'
import Avatar from './Avatar'

export default function Sidebar() {
  const pathname = usePathname()
  const { user, profile, signOut } = useAuthStore()
  const { unreadCount } = useNotificationStore()

  const navItems = [
    { href: '/', icon: Home, label: 'Home' },
    { href: '/search', icon: Search, label: 'Search' },
    { href: '/notifications', icon: Bell, label: 'Notifications' },
    { href: '/trending', icon: TrendingUp, label: 'Trending' },
    { href: '/reposted', icon: Repeat, label: 'Reposted' },
  ]

  if (user && profile) {
    navItems.push({ href: `/u/${profile.username}`, icon: User, label: 'Profile' })
  }

  return (
    <aside className="hidden lg:flex flex-col w-[72px] xl:w-[260px] h-screen fixed top-0 left-0 xl:left-[calc(50%-670px)] py-4 px-2 z-30 bg-white items-end">
      <div className="mb-4 px-3 pt-2 flex justify-end w-full">
        <Link href="/" className="no-underline group flex items-baseline">
          <span className="text-2xl xl:text-3xl font-black text-gray-900 hover:opacity-80 transition-opacity tracking-tighter">
            <span className="xl:hidden">K</span>
            <span className="hidden xl:inline">Key</span>
          </span>
          <span className="text-2xl xl:text-3xl font-normal text-primary hover:opacity-80 transition-opacity tracking-normal -ml-0.5" style={{ fontFamily: 'var(--font-pacifico)' }}>Yap!</span>
        </Link>
      </div>

      {/* Nav - Right Aligned Items with slightly smaller font */}
      <nav className="flex flex-col items-end w-full space-y-0.5">
        {navItems.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href
          
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-full transition-all duration-200 group no-underline ${
                isActive ? 'text-primary' : 'text-gray-900 hover:bg-gray-100'
              }`}
            >
              <span className={`text-[15px] hidden xl:inline text-right ${isActive ? 'font-bold' : 'font-medium'}`}>{item.label}</span>
              <div className="relative">
                <Icon className={`w-[22px] h-[22px] ${isActive ? 'text-primary' : 'text-gray-700'}`} strokeWidth={isActive ? 2.5 : 2} />
                {item.label === 'Notifications' && unreadCount > 0 && (
                  <div className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] bg-primary text-white text-[10px] font-bold rounded-full border-2 border-white flex items-center justify-center px-1 animate-in zoom-in duration-200">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </div>
                )}
              </div>
            </Link>
          )
        })}
      </nav>

      {/* Post Button - Right Aligned */}
      <div className="mt-4 px-2 w-full flex justify-end">
        <Link
          href="/create"
          className="flex items-center justify-center h-[40px] w-10 xl:w-[110px] bg-primary text-white rounded-full font-bold text-sm hover:bg-primary/90 transition-all shadow-sm active:scale-95 no-underline"
        >
          <span className="hidden xl:inline">Post</span>
          <PenSquare className="w-5 h-5 xl:hidden" />
        </Link>
      </div>

      {/* User Account Section - Right Aligned at Bottom */}
      <div className="mt-auto mb-4 px-2 w-full flex flex-col items-end gap-2">
        {user && profile ? (
          <>
            <Link
              href={`/u/${profile.username}`}
              className="flex items-center gap-2 p-2 rounded-full hover:bg-gray-100 transition-colors group max-w-full no-underline"
            >
              <div className="hidden xl:flex flex-col items-end min-w-0">
                <span className="font-bold text-[12px] truncate leading-tight text-gray-900">{profile.full_name || profile.username}</span>
                <span className="text-[11px] text-gray-400 truncate leading-tight">@{profile.username}</span>
              </div>
              <Avatar url={profile.avatar_url || undefined} username={profile.username} size="sm" />
            </Link>
            
            <button
              onClick={() => signOut()}
              className="flex items-center gap-2 p-2 rounded-full hover:bg-rose-50 text-gray-400 hover:text-rose-600 transition-colors"
              title="Logout"
            >
              <span className="hidden xl:inline font-bold text-[11px]">Logout</span>
              <LogOut className="w-4 h-4" />
            </button>
          </>
        ) : (
          <Link
            href="/login"
            className="flex items-center gap-2 p-2 rounded-full text-gray-900 border border-gray-100 hover:bg-gray-50 transition-colors no-underline"
          >
            <span className="hidden xl:inline font-bold text-xs px-2">Log in</span>
            <div className="w-8 h-8 flex items-center justify-center bg-gray-50 rounded-full">
              <User className="w-5 h-5 text-gray-400" />
            </div>
          </Link>
        )}
      </div>
    </aside>
  )
}
