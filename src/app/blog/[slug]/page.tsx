'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, MessageCircle, Send, SendHorizontal, Link as LinkIcon, ExternalLink } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import Sidebar from '@/components/Sidebar'
import RightSidebar from '@/components/RightSidebar'
import Navigation from '@/components/Navigation'
import Avatar from '@/components/Avatar'
import { formatDate } from '@/lib/utils'
import { escapeHtml } from '@/lib/sanitize'
import { PostDetailSkeleton } from '@/components/Skeleton'

export default function BlogDetailPage() {
  const params = useParams()
  const router = useRouter()
  const slug = params.slug as string
  const { user, profile: currentProfile } = useAuthStore()
  
  const [blog, setBlog] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [comments, setComments] = useState<any[]>([])
  const [newComment, setNewComment] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  const commentInputRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    async function fetchBlog() {
      try {
        const { data, error } = await supabase
          .from('blogs')
          .select('*, profiles(id, username, full_name, avatar_url)')
          .eq('status', 'published')
          .eq('slug', slug)
          .single()

        if (error) throw error
        setBlog(data)
        
        // Fetch comments after blog loads
        if (data) fetchComments(data.id)
      } catch (err) {
        console.error('Error fetching blog:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchBlog()
  }, [slug])

  async function fetchComments(blogId: string) {
    try {
      const { data, error } = await supabase
        .from('comments')
        .select('*, profiles(username, full_name, avatar_url)')
        .eq('blog_id', blogId)
        .eq('is_deleted', false)
        .order('created_at', { ascending: true })

      if (error) throw error
      setComments(data || [])
    } catch (err) {
      console.error('Error fetching comments:', err)
    }
  }

  async function handleSubmitComment(e?: any) {
    if (e?.preventDefault) e.preventDefault()
    if (!user || !newComment.trim() || !blog) return

    setIsSubmitting(true)
    const content = newComment.trim()
    setNewComment('')

    try {
      const { error } = await supabase.from('comments').insert({
        user_id: user.id,
        blog_id: blog.id,
        content: content
      })

      if (error) throw error
      await fetchComments(blog.id)
    } catch (err) {
      console.error('Error adding comment:', err)
      setNewComment(content) // Restore on error
    } finally {
      setIsSubmitting(false)
    }
  }

  function formatContent(content: string, isRichText: boolean = false) {
    if (!content) return null
    
    if (isRichText) {
      // For blog content which is now HTML from Rich Editor
      return (
        <div 
          className="prose prose-orange max-w-none prose-p:leading-relaxed prose-pre:bg-gray-900 prose-pre:text-white prose-img:rounded-2xl"
          dangerouslySetInnerHTML={{ __html: content }} 
        />
      )
    }

    let formatted = escapeHtml(content)
      .replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank" rel="noopener noreferrer" class="text-primary hover:underline">$1</a>')
      .replace(/@(\w+)/g, '<a href="/u/$1" class="text-primary font-bold hover:underline">@$1</a>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    
    return formatted.split('\n').map((line, i) => (
      <span key={i} className="block min-h-[1.2rem]">
        <span dangerouslySetInnerHTML={{ __html: line }} />
      </span>
    ))
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white">
        <Sidebar />
        <div className="lg:ml-[72px] xl:ml-[260px] flex justify-center">
            <div className="w-full max-w-2xl px-4 py-8">
                <PostDetailSkeleton />
            </div>
        </div>
      </div>
    )
  }

  if (!blog) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <h1 className="text-2xl font-bold text-gray-900">Blog post not found</h1>
        <Link href="/blog" className="mt-4 text-primary font-bold hover:underline">Back to blog</Link>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white">
      <Sidebar />
      <div className="lg:ml-[72px] xl:ml-[260px] flex justify-center">
        <div className="flex w-full max-w-[1050px] min-w-0 items-start">
          <main className="flex-1 max-w-2xl w-full border-x border-gray-100 min-h-screen bg-white">
            {/* Header / Back */}
            <div className="sticky top-0 z-20 flex items-center gap-6 px-4 py-3 bg-white/80 backdrop-blur-md border-b border-gray-50">
              <button 
                onClick={() => router.back()}
                className="p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-gray-900" />
              </button>
              <h1 className="text-xl font-black text-gray-900 truncate">Article</h1>
            </div>

            <article className="px-4 py-8">
              {/* Author Info */}
              <div className="flex items-center gap-3 mb-6">
                <Avatar 
                  url={blog.profiles?.avatar_url || undefined} 
                  username={blog.profiles?.username} 
                  size="md" 
                />
                <div>
                  <div className="font-black text-gray-900 leading-none mb-1">
                    {blog.profiles?.full_name || 'Admin'}
                  </div>
                  <div className="text-[13px] text-gray-500 font-medium">
                    Posted on {formatDate(blog.created_at)}
                  </div>
                </div>
              </div>

              {/* Title */}
              <h1 className="text-3xl md:text-4xl font-black text-gray-900 leading-tight mb-6">
                {blog.title}
              </h1>

              {/* Image */}
              {blog.image_url && (
                <div className="rounded-2xl overflow-hidden border border-gray-100 mb-8 bg-gray-50">
                  <img 
                    src={blog.image_url} 
                    alt={blog.title} 
                    className="w-full h-auto object-cover"
                  />
                </div>
              )}

              {/* Content */}
              <div className="text-[17px] text-gray-800 leading-relaxed break-words font-medium">
                {formatContent(blog.content, true)}
              </div>

              {/* Link Previews */}
              {(() => {
                const cleanText = blog.content.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ');
                const urls = cleanText.match(/https?:\/\/[^\s<>"]+/g);
                if (urls && urls.length > 0) {
                  return (
                    <div className="mt-12 pt-8 border-t border-gray-50 flex flex-col gap-4">
                      <p className="text-[11px] font-bold text-gray-400 uppercase tracking-widest mb-2">Internal Links & References</p>
                      {Array.from(new Set(urls)).map((url: any, idx) => (
                        <a 
                          key={idx}
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-4 p-4 bg-gray-50/50 hover:bg-orange-50/50 rounded-2xl border border-gray-100 transition-all group"
                        >
                          <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center text-gray-400 group-hover:text-orange-500 transition-colors">
                            <LinkIcon className="w-5 h-5" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-gray-400 mb-0.5">Detected Link</p>
                            <p className="text-sm font-bold text-gray-800 truncate">{url}</p>
                          </div>
                          <ExternalLink className="w-4 h-4 text-gray-300 group-hover:text-orange-400" />
                        </a>
                      ))}
                    </div>
                  );
                }
                return null;
              })()}
            </article>

            {/* Comments Section */}
            <div className="border-t border-gray-100 mt-8">
              <div className="p-4 border-b border-gray-50 bg-gray-50/30 flex items-center justify-between">
                <h3 className="font-black text-gray-900 flex items-center gap-2">
                  <MessageCircle className="w-5 h-5" />
                  Discussions ({comments.length})
                </h3>
              </div>

              {/* Comment Input */}
              {user ? (
                <div className="p-4 border-b border-gray-100">
                  <div className="flex gap-3">
                    <Avatar url={currentProfile?.avatar_url || undefined} username={currentProfile?.username} size="sm" />
                    <div className="flex-1">
                      <textarea
                        ref={commentInputRef}
                        placeholder="Write your thoughts..."
                        value={newComment}
                        onChange={(e) => {
                            setNewComment(e.target.value)
                            e.target.style.height = 'auto'
                            e.target.style.height = `${e.target.scrollHeight}px`
                        }}
                        className="w-full bg-transparent text-[15px] text-gray-900 placeholder-gray-400 focus:outline-none resize-none min-h-[40px] max-h-[300px] py-1.5"
                      />
                      <div className="flex justify-end mt-3 border-t border-gray-50 pt-3">
                        <button
                          disabled={!newComment.trim() || isSubmitting}
                          onClick={handleSubmitComment}
                          className="bg-primary text-white p-2.5 rounded-full hover:bg-primary-hover transition-all disabled:opacity-50 shadow-md active:scale-95"
                        >
                          <SendHorizontal className="w-5 h-5" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center bg-gray-50/50">
                  <p className="text-gray-500 mb-4 font-medium">Join the discussion</p>
                  <Link href="/login" className="px-6 py-2.5 bg-primary text-white rounded-full font-black text-sm hover:bg-primary-hover shadow-sm">
                    Log In to Comment
                  </Link>
                </div>
              )}

              {/* Comments List */}
              <div className="divide-y divide-gray-50 pb-[100px]">
                {comments.length === 0 ? (
                  <div className="py-12 text-center">
                    <p className="text-gray-400 font-bold">Be the first to yap about this article! ✨</p>
                  </div>
                ) : (
                  comments.map((comment) => (
                    <div key={comment.id} className="p-4 hover:bg-gray-50/50 transition-colors">
                      <div className="flex gap-3">
                        <Link href={`/u/${comment.profiles?.username}`}>
                          <Avatar url={comment.profiles?.avatar_url || undefined} username={comment.profiles?.username} size="sm" />
                        </Link>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <span className="font-bold text-[14px] text-gray-900">{comment.profiles?.full_name || comment.profiles?.username}</span>
                            <span className="text-gray-400 text-[13px]">· {formatDate(comment.created_at)}</span>
                          </div>
                          <div className="text-[15px] text-gray-800 leading-relaxed break-words whitespace-pre-wrap font-medium">
                            {formatContent(comment.content)}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
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
