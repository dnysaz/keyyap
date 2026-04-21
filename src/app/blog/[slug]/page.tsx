import { Metadata } from 'next'
import { supabase } from '@/lib/supabase'
import BlogClient from './BlogClient'
import Link from 'next/link'

interface Props {
  params: { slug: string }
}

// 1. DYNAMIC SEO METADATA (Runs on Server)
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const slug = (await params).slug
  const { data: blog } = await supabase
    .from('blogs')
    .select('title, content, image_url')
    .eq('slug', slug)
    .single()

  if (!blog) return { title: 'Blog Post Not Found - KeyYap' }

  // Clean description from HTML
  const description = blog.content
    ? blog.content.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').substring(0, 160) + '...'
    : 'Read this interesting blog post on KeyYap.'

  return {
    title: `${blog.title} - KeyYap`,
    description: description,
    openGraph: {
      title: blog.title,
      description: description,
      images: blog.image_url ? [blog.image_url] : ['/og-image.png'],
      type: 'article',
      url: `https://keyyap.vercel.app/blog/${slug}`,
    },
    twitter: {
      card: 'summary_large_image',
      title: blog.title,
      description: description,
      images: blog.image_url ? [blog.image_url] : ['/og-image.png'],
    },
  }
}

import Sidebar from '@/components/Sidebar'
import RightSidebar from '@/components/RightSidebar'

// 2. SERVER COMPONENT (Fetches Initial Data)
export default async function BlogDetailPage({ params }: Props) {
  const slug = (await params).slug
  const { data: blog } = await supabase
    .from('blogs')
    .select('*, profiles(id, username, full_name, avatar_url)')
    .eq('status', 'published')
    .eq('slug', slug)
    .single()

  if (!blog) {
    return (
      <div className="min-h-screen bg-white">
        <Sidebar />
        <div className="lg:ml-[72px] xl:ml-[260px] flex justify-center">
          <div className="flex w-full max-w-[1050px] min-w-0 items-start">
            <main className="flex-1 max-w-2xl w-full border-x border-gray-100 min-h-screen bg-white flex flex-col items-center justify-center p-8 text-center">
               <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mb-6">
                  <span className="text-4xl">🔍</span>
               </div>
               <h1 className="text-2xl font-black text-gray-900">Blog post not found</h1>
               <p className="text-gray-500 mt-2 font-medium">The article you looking for doesn't exist or has been removed.</p>
               <Link href="/blog" className="mt-8 px-8 py-3 bg-primary text-white rounded-full font-black text-sm hover:bg-primary-hover shadow-md transition-all active:scale-95">
                  Back to Blog Feed
               </Link>
            </main>
            <RightSidebar />
          </div>
        </div>
      </div>
    )
  }

  // Render Client Component and pass the data
  return <BlogClient initialBlog={blog} />
}
