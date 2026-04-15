'use client'

import { useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { X, Home, Search, Plus, Heart, User, LogOut, Bold, Italic, Underline, TrendingUp, Repeat } from 'lucide-react'
import Sidebar from '@/components/Sidebar'
import RightSidebar from '@/components/RightSidebar'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import Navigation from '@/components/Navigation'
import AuthGuard from '@/components/AuthGuard'

const MAX_CHARS = 512

export default function CreatePage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuthStore()
  const [content, setContent] = useState('')
  const [hashtags, setHashtags] = useState('')
  const [trendingTags, setTrendingTags] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [previewData, setPreviewData] = useState<any>(null)
  const [previewLoading, setPreviewLoading] = useState(false)

  const charCount = content.length
  const isOverLimit = charCount > MAX_CHARS

  useEffect(() => {
    fetchTrendingTags()
  }, [])

  // Detect URL and fetch preview
  useEffect(() => {
    const urlRegex = /(https?:\/\/[^\s]+)/
    const match = content.match(urlRegex)

    if (match) {
      const url = match[0]
      if (previewData?.url === url) return

      const timer = setTimeout(async () => {
        setPreviewLoading(true)
        try {
          const res = await fetch(`/api/og?url=${encodeURIComponent(url)}`)
          const data = await res.json()
          if (!data.error) {
            setPreviewData(data)
          } else {
            setPreviewData(null)
          }
        } catch (err) {
          console.error('Preview error:', err)
          setPreviewData(null)
        } finally {
          setPreviewLoading(false)
        }
      }, 800)

      return () => clearTimeout(timer)
    } else {
      setPreviewData(null)
    }
  }, [content, previewData?.url])

  async function fetchTrendingTags() {
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    const { data } = await supabase
      .from('posts')
      .select('hashtags, likes_count, comments_count')
      .gte('created_at', since.toISOString())
      .eq('is_deleted', false)
      .not('hashtags', 'is', null)

    const hashtagCounts = new Map<string, number>()

    data?.forEach(post => {
      const tags = post.hashtags as string[]
      if (Array.isArray(tags)) {
        tags.forEach(tag => {
          const safeTag = typeof tag === 'string' ? tag.toLowerCase().replace(/[^a-z0-9_]/g, '') : ''
          if (safeTag) {
            const weight = 1 + (post.likes_count || 0) + (post.comments_count || 0) * 2;
            hashtagCounts.set(safeTag, (hashtagCounts.get(safeTag) || 0) + weight)
          }
        })
      }
    })

    const sortedHashtags = Array.from(hashtagCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(entry => entry[0])

    setTrendingTags(sortedHashtags)
  }

  const handleAppendTag = (tag: string) => {
    const currentTags = hashtags.split(',').map(t => t.trim()).filter(t => t)
    if (!currentTags.includes(tag)) {
      setHashtags(currentTags.length > 0 ? `${currentTags.join(', ')}, ${tag}` : tag)
    }
  }

  const insertFormat = (wrapper: string) => {
    const textarea = document.querySelector('textarea') as HTMLTextAreaElement
    if (!textarea) return
    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const selected = content.substring(start, end)
    const before = content.substring(0, start)
    const after = content.substring(end)
    let newText = ''
    if (wrapper === 'bold') newText = `**${selected}**`
    else if (wrapper === 'italic') newText = `*${selected}*`
    else if (wrapper === 'underline') newText = `__${selected}__`
    setContent(before + newText + after)
    setTimeout(() => {
      textarea.focus()
      textarea.setSelectionRange(start + (wrapper === 'bold' ? 2 : wrapper === 'italic' ? 1 : 2), end + (wrapper === 'bold' ? 2 : wrapper === 'italic' ? 1 : 2))
    }, 0)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) {
      router.push('/login')
      return
    }
    if (isOverLimit || !content.trim()) return

    setLoading(true)
    setError('')

    try {
      // Force refresh the session first — prevents stale token after idle
      const { error: refreshError } = await supabase.auth.refreshSession()
      if (refreshError) {
        console.error('Session refresh failed:', refreshError)
        setError('Your session has expired. Redirecting to login...')
        setLoading(false)
        setTimeout(() => router.push('/login'), 1500)
        return
      }

      const { data: { user: currentUser } } = await supabase.auth.getUser()
      if (!currentUser) {
        setError('Session expired. Please login again.')
        setLoading(false)
        setTimeout(() => router.push('/login'), 1500)
        return
      }

      const tags = hashtags
        .split(',')
        .map((t) => t.trim().toLowerCase().replace(/^#/, ''))
        .filter((t) => t.length > 0)

      const { error: postError } = await supabase.from('posts').insert({
        user_id: currentUser.id,
        content: content.trim(),
        hashtags: tags.length > 0 ? tags : null,
      })

      if (postError) {
        setError(postError.message)
        setLoading(false)
        return
      }

      router.push('/')
    } catch (err) {
      console.error('Submit error:', err)
      setError('Something went wrong. Please try again.')
      setLoading(false)
    }
  }

  return (
    <AuthGuard>
      <div className="min-h-screen bg-white">
        <Sidebar />
        <div className="lg:ml-[68px] xl:ml-[275px] flex justify-center">
          <div className="flex w-full max-w-[1050px]">
            <main className="flex-1 max-w-2xl border-x border-gray-100 min-h-screen relative">
              <div className="sticky top-0 bg-white/80 backdrop-blur-md z-10 px-4 py-3 border-b border-gray-50 flex items-center justify-between">
                <button onClick={() => router.back()} className="text-gray-500 hover:bg-gray-100 p-2 rounded-full transition-colors flex shrink-0">
                  <X className="w-6 h-6" />
                </button>
                <h1 className="text-lg font-bold">Create Post</h1>
                <div className="w-10" />
              </div>

              <div className="px-4 py-6">
                <form onSubmit={handleSubmit} className="space-y-4">
                  {error && (
                    <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">
                      {error}
                    </div>
                  )}

                  <div>
                    <div className="flex gap-1 mb-2">
                      <button type="button" onClick={() => insertFormat('bold')} className="p-2 rounded hover:bg-gray-100" title="Bold">
                        <Bold className="w-5 h-5" />
                      </button>
                      <button type="button" onClick={() => insertFormat('italic')} className="p-2 rounded hover:bg-gray-100" title="Italic">
                        <Italic className="w-5 h-5" />
                      </button>
                      <button type="button" onClick={() => insertFormat('underline')} className="p-2 rounded hover:bg-gray-100" title="Underline">
                        <Underline className="w-5 h-5" />
                      </button>
                    </div>
                    <textarea
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      placeholder="Ready for yapping?"
                      className="w-full h-48 py-2 border-0 focus:border-transparent focus:ring-0 resize-none outline-none bg-transparent placeholder:text-gray-400 text-lg"
                      maxLength={MAX_CHARS + 20}
                    />

                    {/* Link Preview (Styled like PostCard/Home) */}
                    {(previewLoading || previewData) && (
                      <div className="mt-4 border border-gray-100 rounded-2xl overflow-hidden bg-white shadow-sm flex flex-col transition-all">
                        {previewLoading ? (
                          <div className="w-full py-8 text-center text-xs text-gray-400 font-medium tracking-widest animate-pulse uppercase">
                            Fetching link preview...
                          </div>
                        ) : (
                          <a
                            href={previewData.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block w-full group"
                          >
                            {previewData.image && (
                              <div className="w-full h-48 sm:h-64 relative overflow-hidden bg-gray-50 border-b border-gray-50">
                                <img
                                  src={previewData.image}
                                  alt=""
                                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                />
                              </div>
                            )}
                            <div className="p-4 flex-1 min-w-0">
                              <div className="flex items-center gap-1.5 text-[12px] text-gray-500 mb-1">
                                <Search className="w-3 h-3" /> {new URL(previewData.url).hostname.replace('www.', '')}
                              </div>
                              <h4 className="font-bold text-gray-900 text-[15px] line-clamp-1 group-hover:text-primary transition-colors">
                                {previewData.title || 'Link Preview'}
                              </h4>
                              {previewData.description && (
                                <p className="text-sm text-gray-500 line-clamp-2 mt-1 leading-snug">
                                  {previewData.description}
                                </p>
                              )}
                            </div>
                          </a>
                        )}
                      </div>
                    )}

                    <div className={`text-right text-sm mt-1 ${isOverLimit ? 'text-red-500' : 'text-gray-400'}`}>
                      {charCount}/{MAX_CHARS}
                    </div>
                  </div>

                  <div className="pt-4 border-t border-gray-50">
                    <label className="block text-gray-500 mb-2">
                      Hashtags (Separate with comma)
                    </label>
                    <input
                      type="text"
                      value={hashtags}
                      onChange={(e) => setHashtags(e.target.value)}
                      placeholder="introvert, thoughts, daily"
                      className="w-full py-2 border-0 focus:border-transparent focus:ring-0 outline-none bg-transparent text-gray-700 placeholder:text-gray-300"
                    />
                    {trendingTags.length > 0 && (
                      <div className="flex flex-wrap items-center gap-2 mt-4">
                        <span className="text-xs text-gray-400 flex items-center gap-1 font-bold uppercase tracking-wider">
                          <TrendingUp className="w-3 h-3" /> Trending:
                        </span>
                        {trendingTags.map(tag => (
                          <button
                            key={tag}
                            type="button"
                            onClick={() => handleAppendTag(tag)}
                            className="text-xs bg-gray-50 hover:bg-gray-100 text-gray-600 px-3 py-1.5 rounded-full transition-colors font-bold border border-gray-100"
                          >
                            #{tag}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={loading || isOverLimit || !content.trim()}
                    className="w-full bg-primary text-white py-4 rounded-full font-black text-lg hover:shadow-lg hover:shadow-primary/20 hover:-translate-y-0.5 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none mt-4"
                  >
                    {loading ? 'Posting...' : 'Create Post'}
                  </button>
                </form>
              </div>
            </main>
            <RightSidebar />
          </div>
        </div>
        <div className="lg:hidden">
          <Navigation />
        </div>
      </div>
    </AuthGuard>
  )
}