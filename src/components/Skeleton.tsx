'use client'

// Skeleton shimmer effect for lazy loading
export function PostSkeleton() {
  return (
    <div className="px-4 py-4 border-b border-gray-50 animate-pulse">
      <div className="flex gap-3">
        <div className="w-10 h-10 rounded-full bg-gray-200 shrink-0" />
        <div className="flex-1 space-y-3">
          <div className="flex items-center gap-2">
            <div className="h-4 w-24 bg-gray-200 rounded-full" />
            <div className="h-3 w-12 bg-gray-100 rounded-full" />
          </div>
          <div className="space-y-2">
            <div className="h-3.5 w-full bg-gray-200 rounded-full" />
            <div className="h-3.5 w-4/5 bg-gray-200 rounded-full" />
            <div className="h-3.5 w-3/5 bg-gray-100 rounded-full" />
          </div>
          <div className="flex gap-8 pt-2">
            <div className="h-4 w-10 bg-gray-100 rounded-full" />
            <div className="h-4 w-10 bg-gray-100 rounded-full" />
            <div className="h-4 w-10 bg-gray-100 rounded-full" />
          </div>
        </div>
      </div>
    </div>
  )
}

export function FeedSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div>
      {Array.from({ length: count }).map((_, i) => (
        <PostSkeleton key={i} />
      ))}
    </div>
  )
}

export function ProfileSkeleton() {
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-2xl mx-auto border-x border-gray-200 min-h-screen">
        {/* Cover */}
        <div className="h-48 bg-gradient-to-b from-gray-100 to-gray-50 animate-pulse" />
        
        <div className="px-4 -mt-16 animate-pulse">
          {/* Avatar + button */}
          <div className="flex justify-between items-end">
            <div className="w-24 h-24 rounded-full bg-gray-200 border-4 border-white" />
            <div className="h-9 w-24 bg-gray-200 rounded-full" />
          </div>
          
          {/* Name / username */}
          <div className="mt-4 space-y-2">
            <div className="h-5 w-36 bg-gray-200 rounded-full" />
            <div className="h-4 w-24 bg-gray-100 rounded-full" />
          </div>
          
          {/* Bio */}
          <div className="mt-3 space-y-2">
            <div className="h-3.5 w-full bg-gray-100 rounded-full" />
            <div className="h-3.5 w-2/3 bg-gray-100 rounded-full" />
          </div>
          
          {/* Stats */}
          <div className="flex gap-4 mt-4">
            <div className="h-4 w-20 bg-gray-100 rounded-full" />
            <div className="h-4 w-20 bg-gray-100 rounded-full" />
          </div>
        </div>

        {/* Tabs */}
        <div className="mt-6 border-t border-gray-50 animate-pulse">
          <div className="flex border-b border-gray-50 px-4 py-3 gap-8">
            <div className="h-4 w-12 bg-gray-200 rounded-full" />
            <div className="h-4 w-14 bg-gray-100 rounded-full" />
            <div className="h-4 w-16 bg-gray-100 rounded-full" />
          </div>
        </div>

        {/* Posts */}
        <FeedSkeleton count={3} />
      </div>
    </div>
  )
}

export function PostDetailSkeleton() {
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-2xl mx-auto border-x border-gray-100">
        {/* Header */}
        <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-4 animate-pulse">
          <div className="w-8 h-8 rounded-full bg-gray-200" />
          <div className="h-4 w-16 bg-gray-200 rounded-full" />
        </div>

        {/* Post content */}
        <div className="px-4 py-4 animate-pulse">
          <div className="flex gap-3">
            <div className="w-10 h-10 rounded-full bg-gray-200 shrink-0" />
            <div className="flex-1 space-y-3">
              <div className="flex items-center gap-2">
                <div className="h-4 w-28 bg-gray-200 rounded-full" />
                <div className="h-3 w-10 bg-gray-100 rounded-full" />
              </div>
              <div className="space-y-2 pt-1">
                <div className="h-4 w-full bg-gray-200 rounded-full" />
                <div className="h-4 w-5/6 bg-gray-200 rounded-full" />
                <div className="h-4 w-3/4 bg-gray-100 rounded-full" />
                <div className="h-4 w-1/2 bg-gray-100 rounded-full" />
              </div>
              <div className="flex gap-8 pt-3">
                <div className="h-5 w-12 bg-gray-100 rounded-full" />
                <div className="h-5 w-12 bg-gray-100 rounded-full" />
                <div className="h-5 w-12 bg-gray-100 rounded-full" />
              </div>
            </div>
          </div>
        </div>

        {/* Comments skeleton */}
        <div className="border-t border-gray-100 animate-pulse">
          <div className="px-6 py-4">
            <div className="h-5 w-28 bg-gray-200 rounded-full" />
          </div>
          <PostSkeleton />
          <PostSkeleton />
        </div>
      </div>
    </div>
  )
}

export function NotificationSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-4 py-4 border-b border-gray-50 animate-pulse">
          <div className="w-10 h-10 rounded-full bg-gray-200 shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-3.5 w-3/4 bg-gray-200 rounded-full" />
            <div className="h-3 w-1/3 bg-gray-100 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  )
}

export function UserSkeleton() {
  return (
    <div className="p-4 flex items-start gap-3 animate-pulse border-b border-gray-50 last:border-0">
      <div className="w-12 h-12 rounded-full bg-gray-200 shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <div className="space-y-2">
            <div className="h-4 w-32 bg-gray-200 rounded-full" />
            <div className="h-3.5 w-24 bg-gray-100 rounded-full" />
          </div>
          <div className="h-8 w-20 bg-gray-200 rounded-full" />
        </div>
        <div className="mt-2 space-y-1.5">
          <div className="h-3 w-full bg-gray-100 rounded-full" />
          <div className="h-3 w-2/3 bg-gray-100 rounded-full" />
        </div>
      </div>
    </div>
  )
}

export function UserListSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div>
      {Array.from({ length: count }).map((_, i) => (
        <UserSkeleton key={i} />
      ))}
    </div>
  )
}
