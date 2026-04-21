import { Metadata } from 'next'
import { supabase } from '@/lib/supabase'
import BlogClient from './BlogClient'
import Link from 'next/link'

interface Props {
  params: { slug: string }
}

// 1. DYNAMIC SEO METADATA (Runs on Server)
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { data: blog } = await supabase
    .from('blogs')
    .select('title, content, image_url')
    .eq('slug', params.slug)
    .single()

  if (!blog) return { title: 'Blog Post Not Found - KeyYap' }

  // Clean description from HTML
  const description = blog.content
    ? blog.content.replace(/<[^>]*>/g, '').substring(0, 160) + '...'
    : 'Read this interesting blog post on KeyYap.'

  return {
    title: `${blog.title} - KeyYap`,
    description: description,
    openGraph: {
      title: blog.title,
      description: description,
      images: blog.image_url ? [blog.image_url] : ['/og-image.png'],
      type: 'article',
    },
    twitter: {
      card: 'summary_large_image',
      title: blog.title,
      description: description,
      images: blog.image_url ? [blog.image_url] : ['/og-image.png'],
    },
  }
}

// 2. SERVER COMPONENT (Fetches Initial Data)
export default async function BlogDetailPage({ params }: Props) {
  const { data: blog } = await supabase
    .from('blogs')
    .select('*, profiles(id, username, full_name, avatar_url)')
    .eq('status', 'published')
    .eq('slug', params.slug)
    .single()

  if (!blog) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <h1 className="text-2xl font-bold text-gray-900">Blog post not found</h1>
        <Link href="/blog" className="mt-4 text-primary font-bold hover:underline">Back to blog</Link>
      </div>
    )
  }

  // Render Client Component and pass the data
  return <BlogClient initialBlog={blog} />
}
