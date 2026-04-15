'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/stores/authStore'
import { FeedSkeleton } from './Skeleton'

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading, fetchUser } = useAuthStore()
  const router = useRouter()

  useEffect(() => {
    fetchUser()
  }, [fetchUser])

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login')
    }
  }, [loading, user, router])

  if (loading || !user) {
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
