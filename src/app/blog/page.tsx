'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import Sidebar from '@/components/Sidebar'
import RightSidebar from '@/components/RightSidebar'
import Navigation from '@/components/Navigation'
import BlogCard from '@/components/BlogCard'
import { FeedSkeleton } from '@/components/Skeleton'
import MainTabs from '@/components/MainTabs'

export default function BlogListPage() {
  const [blogs, setBlogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchBlogs() {
      try {
        const { data, error } = await supabase
          .from('blogs')
          .select('*, profiles(username, full_name, avatar_url)')
          .eq('status', 'published')
          .order('created_at', { ascending: false })

        if (error) throw error
        setBlogs(data || [])
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
                  {blogs.map((blog) => (
                    <BlogCard key={blog.id} blog={blog} />
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
