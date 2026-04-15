'use client'

import { Suspense } from 'react'
import Feed from '@/components/Feed'
import FeedHeader from '@/components/FeedHeader'
import Navigation from '@/components/Navigation'
import Sidebar from '@/components/Sidebar'
import RightSidebar from '@/components/RightSidebar'
import { FeedSkeleton } from '@/components/Skeleton'
import MainTabs from '@/components/MainTabs'
import { Globe } from 'lucide-react'

function LoadingState() {
  return (
    <div className="pt-2">
      <FeedSkeleton count={5} />
    </div>
  )
}

export default function GlobalPage() {
  return (
    <div className="min-h-screen bg-white">
      <Sidebar />
      <div className="lg:ml-[72px] xl:ml-[260px] flex justify-center">
        <div className="flex w-full max-w-[1050px] min-w-0 items-start">
          <main className="flex-1 max-w-2xl w-full border-x border-gray-100 min-h-screen min-w-0 bg-white">
            <MainTabs />
            <div className="p-4 border-b border-gray-100 flex items-center gap-2 sticky top-[53px] bg-white/90 backdrop-blur-md z-30">
              <Globe className="w-5 h-5 text-primary" />
              <h1 className="text-xl font-bold tracking-tight">Global Feed</h1>
            </div>
            <div className="pb-16 w-full overflow-x-hidden">
              <Suspense fallback={<LoadingState />}>
                <Feed isGlobal={true} />
              </Suspense>
            </div>
          </main>
          <RightSidebar />
        </div>
      </div>
      <div className="lg:hidden">
        <Navigation />
      </div>
    </div>
  )
}
