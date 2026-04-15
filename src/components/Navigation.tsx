'use client'

import { Home, Search, Pencil, Bell, User } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuthStore } from '@/stores/authStore'

export default function Navigation() {
  const pathname = usePathname()
  const { user, profile } = useAuthStore()

  const isActive = (path: string) => pathname === path

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 pb-safe">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto">
        <Link href="/" className={isActive('/') ? 'text-gray-900' : 'text-gray-500'}>
          <Home className="w-7 h-7" />
        </Link>
        <Link href="/search" className={isActive('/search') ? 'text-gray-900' : 'text-gray-500'}>
          <Search className="w-7 h-7" />
        </Link>
        <Link href="/create">
          <Pencil className="w-7 h-7 text-gray-500" />
        </Link>
        <Link href="/notifications" className={isActive('/notifications') ? 'text-gray-900' : 'text-gray-500'}>
          <Bell className="w-7 h-7" />
        </Link>
        <Link href={user ? `/u/${profile?.username || 'me'}` : '/login'} className={isActive('/login') ? 'text-gray-900 font-bold' : 'text-gray-500'}>
          <User className="w-7 h-7" />
        </Link>
      </div>
    </nav>
  )
}