'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import Sidebar from '@/components/Sidebar'
import RightSidebar from '@/components/RightSidebar'
import Navigation from '@/components/Navigation'
import BlogCard from '@/components/BlogCard'
import { FeedSkeleton } from '@/components/Skeleton'
import MainTabs from '@/components/MainTabs'
import { RandomSidebarAd } from '@/ads/AdManager'

export default function BlogListPage() {
  const [blogs, setBlogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchBlogs() {
      try {
        const { data, error } = await supabase
          .from('blogs')
          .select('*, profiles(username, full_name, avatar_url), comments(count)')
          .eq('status', 'published')
          .order('created_at', { ascending: false })

        if (error) throw error
        
        const formattedData = (data || []).map((blog: any) => ({
          ...blog,
          comments_count: blog.comments?.[0]?.count || 0
        }))
        setBlogs(formattedData)
      } catch (err) {
        console.error('Error fetching blogs:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchBlogs()
  }, [])

  return (
    <div className="min-h-screen bg-white">
      <Sidebar />
      <div className="lg:ml-[72px] xl:ml-[260px] flex justify-center">
        <div className="flex w-full max-w-[1050px] min-w-0 items-start">
          <main className="flex-1 max-w-2xl w-full border-x border-gray-100 min-h-screen min-w-0 bg-white">
            <MainTabs />
            {/* Header */}
            <div className="flex flex-col pt-4 px-4 border-b border-gray-50 pb-4">
              <h1 className="text-2xl font-black text-gray-900 tracking-tight">KeyYap Blog</h1>
              <p className="text-sm text-gray-500 font-medium">Official updates and stories from KeyYap team.</p>
            </div>

            <div className="pb-20">
              {loading ? (
                <div className="pt-4">
                  <FeedSkeleton count={3} />
                </div>
              ) : blogs.length === 0 ? (
                <div className="py-20 text-center">
                  <p className="text-gray-400 font-bold">No blog posts yet. Stay tuned! ✨</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-50">
                  {blogs.map((blog, idx) => (
                    <div key={blog.id}>
                      <BlogCard blog={blog} />
                      {(idx + 1) % 5 === 0 && idx !== blogs.length - 1 && (
                        <div className="py-6 px-4 bg-gray-50/50 border-b border-gray-100 flex justify-center">
                          <div className="w-full max-w-[350px]">
                            <RandomSidebarAd />
                          </div>
                        </div>
                      )}
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
  )
}
