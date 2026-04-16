'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuthStore } from '@/stores/authStore'

const PUBLIC_ROUTES = ['/', '/login', '/signup', '/forgot-password', '/reset-password', '/privacy', '/terms']

export default function GlobalAuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const pathname = usePathname()
  const { user, loading } = useAuthStore()
  const [isMounted, setIsMounted] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  useEffect(() => {
    if (!loading && isMounted) {
      // Allow exact matches
      const isPublic = PUBLIC_ROUTES.includes(pathname)
      
      if (!user && !isPublic) {
        router.push('/login')
      }
    }
  }, [user, loading, pathname, router, isMounted])

  if (!isMounted) return null

  const isPublic = PUBLIC_ROUTES.includes(pathname)

  // Block rendering of protected routes until auth checks out
  if (!user && !isPublic) {
    return <div className="min-h-screen bg-white" />
  }

  return <>{children}</>
}
