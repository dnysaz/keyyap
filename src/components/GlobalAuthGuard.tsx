'use client'

import { useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuthStore } from '@/stores/authStore'

const PUBLIC_ROUTES = [
  '/',
  '/login',
  '/signup',
  '/forgot-password',
  '/reset-password',
  '/privacy',
  '/terms',
  '/cookies',
]

const PUBLIC_PREFIXES = [
  '/blog',
]

function isPublicRoute(pathname: string): boolean {
  const exactMatch = PUBLIC_ROUTES.includes(pathname)
  const prefixMatch = PUBLIC_PREFIXES.some(prefix => pathname.startsWith(prefix))
  return exactMatch || prefixMatch
}

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
      if (!user && !isPublicRoute(pathname)) {
        router.push('/login')
      }
    }
  }, [user, loading, pathname, router, isMounted])

  if (!isMounted) return null

  // Block rendering of protected routes until auth checks out
  if (!user && !isPublicRoute(pathname)) {
    return <div className="min-h-screen bg-white" />
  }

  return <>{children}</>
}