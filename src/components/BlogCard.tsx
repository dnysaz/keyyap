'use client'

import React from 'react'
import Link from 'next/link'
import { MessageCircle, Calendar, User } from 'lucide-react'
import Avatar from './Avatar'
import { formatDate } from '@/lib/utils'

interface BlogCardProps {
  blog: {
    id: string
    title: string
    slug: string
    content: string
    image_url: string | null
    created_at: string
    profiles: {
      username: string
      full_name: string
      avatar_url: string
    } | null
  }
}

export default function BlogCard({ blog }: BlogCardProps) {
  // Strip HTML and truncate content for the feed view
  const cleanText = blog.content.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').trim()
  const truncatedContent = cleanText.length > 160 
    ? cleanText.substring(0, 160) + '...' 
    : cleanText

  return (
    <div className="bg-white border-b border-gray-100 hover:bg-gray-50/30 transition-all px-4 py-8 md:py-10 group">
      <div className="flex gap-4">
        {/* Author Avatar */}
        <div className="shrink-0 pt-1">
          <Avatar 
            url={blog.profiles?.avatar_url || undefined} 
            username={blog.profiles?.username || 'admin'} 
            size="md" 
          />
        </div>

        <div className="flex-1 min-w-0">
          {/* Header Info */}
          <div className="flex items-center gap-2 mb-1 flex-wrap text-[14px]">
            <span className="font-bold text-gray-900">
              {blog.profiles?.full_name || 'KeyYap Admin'}
            </span>
            <span className="text-gray-500">@{blog.profiles?.username || 'admin'}</span>
            <span className="text-gray-400">· {formatDate(blog.created_at)}</span>
          </div>

          {/* Blog Title */}
          <Link href={`/blog/${blog.slug}`} className="block mt-1 group-hover:text-primary transition-colors">
            <h2 className="text-xl md:text-2xl font-black text-gray-900 leading-tight">
              {blog.title}
            </h2>
          </Link>

          {/* Blog Excerpt */}
          <div className="mt-2 text-gray-600 text-[15px] leading-relaxed break-words whitespace-pre-wrap line-clamp-3">
            {truncatedContent}
          </div>

          {/* Featured Image - 1 per Blog Article */}
          {blog.image_url && (
            <Link href={`/blog/${blog.slug}`} className="block mt-4 rounded-2xl overflow-hidden border border-gray-100 bg-gray-50 aspect-video md:aspect-[21/9]">
              <img 
                src={blog.image_url} 
                alt={blog.title}
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
              />
            </Link>
          )}

          {/* Actions / Meta */}
          <div className="flex items-center justify-between mt-6">
            <Link 
              href={`/blog/${blog.slug}`} 
              className="flex items-center gap-2 text-primary font-bold text-sm hover:underline"
            >
              Read full article
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </Link>

            <div className="flex items-center gap-4 text-gray-400 text-sm">
                <div className="flex items-center gap-1.5">
                    <MessageCircle className="w-4 h-4" />
                    <span>Comment</span>
                </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
