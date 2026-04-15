'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/stores/authStore'
import { FeedSkeleton } from './Skeleton'

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuthStore()
  const router = useRouter()

  useEffect(() => {
    // Only redirect when we are CERTAIN there is no user (loading is done).
    // Don't call fetchUser() here — AuthProvider already handles session init.
    if (!loading && !user) {
      router.replace('/login')
    }
  }, [loading, user, router])

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-full max-w-2xl px-4">
           <FeedSkeleton count={3} />
        </div>
      </div>
    )
  }

  if (!user) {
    // Still show skeleton while redirecting
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-full max-w-2xl px-4">
           <FeedSkeleton count={3} />
        </div>
      </div>
    )
  }

  return <>{children}</>
}
