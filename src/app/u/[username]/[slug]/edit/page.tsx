'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { X, Bold, Italic, Underline, Search, TrendingUp, Play } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import Sidebar from '@/components/Sidebar'
import RightSidebar from '@/components/RightSidebar'
import Navigation from '@/components/Navigation'
import AuthGuard from '@/components/AuthGuard'
import Avatar from '@/components/Avatar'
import { getSlug, formatDate } from '@/lib/utils'
import Link from 'next/link'

const MAX_CHARS = 512

export default function EditPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuthStore()
  
  const [content, setContent] = useState('')
  const [hashtags, setHashtags] = useState('')
  const [trendingTags, setTrendingTags] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [previewData, setPreviewData] = useState<any>(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  
  // Quoted Post states
  const [quotedPost, setQuotedPost] = useState<any>(null)
  const [quotedLinkMetas, setQuotedLinkMetas] = useState<any[]>([])
  
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const extractYoutubeId = (url: string) => {
    const match = url.match(/(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/)
    return match ? match[1] : null
  }

  const extractSpotifyId = (url: string) => {
    const match = url.match(/https?:\/\/open\.spotify\.com\/(track|album|playlist)\/([a-zA-Z0-9]+)/)
    if (!match) return null
    return { type: match[1], id: match[2] }
  }

  const extractDomain = (url: string) => {
    try {
      return new URL(url).hostname.replace('www.', '')
    } catch {
      return url
    }
  }

  // Fetch target post data
  useEffect(() => {
    async function fetchPost() {
      const slugStr = params.slug as string
      if (!slugStr) return
      
      const postId = slugStr.includes('-') && slugStr.length >= 36 ? slugStr : slugStr.split('-').pop()
      if (!postId) return

      const { data, error } = await supabase
        .from('posts')
        .select(`
          *,
          quoted:quoted_post_id (
            *,
            profiles:user_id (id, username, full_name, avatar_url)
          )
        `)
        .eq('id', postId)
        .single()

      if (error || !data) {
        setError('Post not found.')
        setLoading(false)
        return
      }

      setContent(data.content || '')
      setHashtags(Array.isArray(data.hashtags) ? data.hashtags.join(', ') : '')
      
      if (data.quoted) {
        setQuotedPost(data.quoted)
        fetchQuotedLinks(data.quoted.content || '')
      }
      
      setLoading(false)
    }

    fetchPost()
    fetchTrendingTags()
  }, [params.slug])

  async function fetchQuotedLinks(text: string) {
    const urlRegex = /(https?:\/\/[^\s]+)/g
    const urls = text.match(urlRegex)
    if (urls) {
      const metas = await Promise.all(
        urls.map(async (url) => {
          if (extractSpotifyId(url)) return null
          try {
            const res = await fetch(`/api/og?url=${encodeURIComponent(url)}`)
            const d = await res.json()
            return d.error ? null : d
          } catch { return null }
        })
      )
      setQuotedLinkMetas(metas.filter(Boolean))
    }
  }

  async function fetchTrendingTags() {
    const { data } = await supabase.from('posts').select('hashtags').not('hashtags', 'is', null).limit(100)
    if (data) {
      const counts: { [key: string]: number } = {}
      data.forEach((p: any) => {
        if (Array.isArray(p.hashtags)) {
          p.hashtags.forEach((tag: string) => {
            counts[tag] = (counts[tag] || 0) + 1
          })
        }
      })
      const sorted = Object.entries(counts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([tag]) => tag)
      setTrendingTags(sorted)
    }
  }

  // Preview Logic (for CURRENT typing)
  useEffect(() => {
    const urlRegex = /(https?:\/\/[^\s]+)/
    const match = content.match(urlRegex)

    if (match) {
      const url = match[0]
      const spotify = extractSpotifyId(url)
      
      if (spotify) {
        setPreviewData({ spotify, url })
        return
      }

      if (previewData?.url === url) return

      const timer = setTimeout(async () => {
        setPreviewLoading(true)
        try {
          const res = await fetch(`/api/og?url=${encodeURIComponent(url)}`)
          const data = await res.json()
          if (!data.error) setPreviewData(data)
          else setPreviewData(null)
        } catch (err) {
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

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || saving) return
    
    setSaving(true)
    setError('')

    try {
      const slugStr = params.slug as string
      const postId = slugStr.includes('-') && slugStr.length >= 36 ? slugStr : slugStr.split('-').pop()

      const tags = hashtags
        .split(',')
        .map((t: string) => t.trim().toLowerCase().replace(/^#/, ''))
        .filter((t: string) => t.length > 0)

      const { error: updateError } = await supabase
        .from('posts')
        .update({
          content: content.trim(),
          hashtags: tags.length > 0 ? tags : null,
          updated_at: new Date().toISOString()
        })
        .eq('id', postId)
        .eq('user_id', user.id)

      if (updateError) throw updateError

      router.back()
    } catch (err: any) {
      setError(err.message)
      setSaving(false)
    }
  }

  const insertFormat = (wrapper: string) => {
    const textarea = textareaRef.current
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
  }

  const handleAppendTag = (tag: string) => {
    const currentTags = hashtags.split(',').map(t => t.trim()).filter(t => t.length > 0)
    if (!currentTags.includes(tag)) {
      setHashtags(currentTags.length > 0 ? `${currentTags.join(', ')}, ${tag}` : tag)
    }
  }

  if (loading) return (
    <div className="min-h-screen bg-white">
      <Sidebar />
      <div className="lg:ml-[68px] xl:ml-[275px] flex justify-center h-screen">
        <div className="w-full max-w-[1050px] flex">
          <main className="flex-1 max-w-2xl border-x border-gray-100 flex flex-col p-8 gap-6">
            <div className="h-8 w-1/3 bg-gray-50 rounded-lg animate-pulse" />
            <div className="h-48 w-full bg-gray-50 rounded-2xl animate-pulse" />
            <div className="h-12 w-full bg-gray-50 rounded-full animate-pulse mt-auto" />
          </main>
          <div className="hidden xl:block w-[350px] p-8 gap-4 flex flex-col">
            <div className="h-[400px] w-full bg-gray-50 rounded-2xl animate-pulse" />
          </div>
        </div>
      </div>
    </div>
  )

  const charCount = content.length
  const isOverLimit = charCount > MAX_CHARS

  return (
    <AuthGuard>
      <div className="min-h-screen bg-white">
        <Sidebar />
        <div className="lg:ml-[68px] xl:ml-[275px] flex justify-center">
          <div className="flex w-full max-w-[1050px]">
            <main className="flex-1 max-w-2xl border-x border-gray-100 min-h-screen relative">
              <div className="sticky top-0 bg-white/80 backdrop-blur-md z-10 px-4 py-3 border-b border-gray-50 flex items-center justify-between">
                <button type="button" onClick={() => router.back()} className="text-gray-500 hover:bg-gray-100 p-2 rounded-full transition-colors flex shrink-0">
                  <X className="w-6 h-6" />
                </button>
                <h1 className="text-lg font-bold">Edit Post</h1>
                <div className="w-10" />
              </div>

              <div className="px-4 py-6">
                <form onSubmit={handleUpdate} className="space-y-4">
                  {error && <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">{error}</div>}

                  <div>
                    <div className="flex gap-1 mb-2">
                      <button type="button" onClick={() => insertFormat('bold')} className="p-2 rounded hover:bg-gray-100">
                        <Bold className="w-5 h-5 text-gray-600" />
                      </button>
                      <button type="button" onClick={() => insertFormat('italic')} className="p-2 rounded hover:bg-gray-100">
                        <Italic className="w-5 h-5 text-gray-600" />
                      </button>
                      <button type="button" onClick={() => insertFormat('underline')} className="p-2 rounded hover:bg-gray-100">
                        <Underline className="w-5 h-5 text-gray-600" />
                      </button>
                    </div>

                    <div className="relative">
                      <textarea
                        ref={textareaRef}
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        placeholder="Edit your yap..."
                        className="w-full h-48 py-2 border-0 focus:border-transparent focus:ring-0 resize-none outline-none bg-transparent placeholder:text-gray-400 text-lg"
                        maxLength={MAX_CHARS + 20}
                      />
                    </div>

                    {/* Spotify/Link Preview for typing content */}
                    {(previewLoading || previewData) && (
                      <div className="mt-4 border border-gray-100 rounded-2xl overflow-hidden bg-white shadow-sm transition-all mb-4">
                        {previewLoading ? (
                          <div className="w-full py-8 text-center text-xs text-gray-400 font-medium tracking-widest animate-pulse uppercase">Fetching preview...</div>
                        ) : previewData?.spotify ? (
                          <div className="w-full">
                            <iframe
                              src={`https://open.spotify.com/embed/${previewData.spotify.type}/${previewData.spotify.id}?utm_source=generator&theme=0`}
                              width="100%"
                              height={previewData.spotify.type === 'track' ? "80" : "152"}
                              frameBorder="0"
                              allowFullScreen
                              allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                              loading="lazy"
                              className="block"
                            />
                          </div>
                        ) : previewData && (
                          <a href={previewData.url} target="_blank" rel="noopener noreferrer" className="block w-full group">
                            {previewData.image && (
                              <div className="w-full h-48 md:h-64 relative overflow-hidden bg-gray-50 border-b border-gray-50">
                                <img src={previewData.image} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                              </div>
                            )}
                            <div className="p-4 flex-1 min-w-0">
                              <div className="flex items-center gap-1.5 text-[12px] text-gray-500 mb-1">
                                <Search className="w-3 h-3" /> {extractDomain(previewData.url)}
                              </div>
                              <h4 className="font-bold text-gray-900 text-[15px] line-clamp-1 group-hover:text-primary transition-colors">{previewData.title || 'Link Preview'}</h4>
                            </div>
                          </a>
                        )}
                      </div>
                    )}

                    {/* QUOTED POST PREVIEW - The missing piece */}
                    {quotedPost && (
                      <div className="mt-4 p-4 border border-gray-100 rounded-2xl bg-gray-50/30">
                        <div className="flex items-center gap-2 mb-2">
                          <Avatar url={quotedPost.profiles?.avatar_url} username={quotedPost.profiles?.username} size="xs" />
                          <span className="font-bold text-sm">{quotedPost.profiles?.full_name || quotedPost.profiles?.username}</span>
                          <span className="text-gray-500 text-xs">@{quotedPost.profiles?.username}</span>
                          <span className="text-gray-400 text-xs">· {formatDate(quotedPost.created_at)}</span>
                        </div>
                        <p className="text-sm text-gray-700 whitespace-pre-wrap line-clamp-3 mb-3">{quotedPost.content}</p>
                        
                        {/* Quoted Media/Spotify */}
                        <div className="space-y-2">
                          {quotedLinkMetas.map((link, idx) => {
                            const ytId = extractYoutubeId(link.url)
                            if (ytId) {
                                return (
                                  <div key={idx} className="rounded-xl overflow-hidden border border-gray-100 bg-black aspect-video relative">
                                    <img src={`https://img.youtube.com/vi/${ytId}/mqdefault.jpg`} className="w-full h-full object-cover opacity-70" alt="" />
                                    <div className="absolute inset-0 flex items-center justify-center">
                                        <Play className="w-8 h-8 text-white fill-current" />
                                    </div>
                                  </div>
                                )
                            }
                            return (
                              <div key={idx} className="rounded-xl border border-gray-100 overflow-hidden bg-white flex items-stretch h-14">
                                {link.image && <img src={link.image} className="w-16 h-full object-cover shrink-0" alt="" />}
                                <div className="p-2 flex-1 min-w-0 flex flex-col justify-center">
                                  <h4 className="font-bold text-[12px] text-gray-900 truncate">{link.title || link.url}</h4>
                                  <p className="text-[9px] text-gray-500 uppercase tracking-widest">{extractDomain(link.url)}</p>
                                </div>
                              </div>
                            )
                          })}

                          {/* Quoted Spotify */}
                          {(() => {
                            const urlRegex = /(https?:\/\/[^\s]+)/g
                            const urls = quotedPost.content?.match(urlRegex) || []
                            return urls.map((url: string, idx: number) => {
                              const spotify = extractSpotifyId(url)
                              if (!spotify) return null
                              return (
                                <div key={`q-spot-${idx}`} className="rounded-xl overflow-hidden border border-gray-100">
                                  <iframe
                                    src={`https://open.spotify.com/embed/${spotify.type}/${spotify.id}?utm_source=generator&theme=0`}
                                    width="100%"
                                    height="80"
                                    frameBorder="0"
                                    allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                                    loading="lazy"
                                  />
                                </div>
                              )
                            })
                          })()}
                        </div>
                      </div>
                    )}

                    <div className="mt-8 pt-6 border-t border-gray-50">
                      <label className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1 block">Hashtags (Separate with comma)</label>
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
                        onClick={handleUpdate}
                        disabled={saving || isOverLimit || !content.trim()}
                        className="w-full bg-primary text-white py-4 rounded-full font-black text-lg hover:shadow-lg hover:shadow-primary/20 hover:-translate-y-0.5 transition-all active:scale-[0.98] disabled:opacity-50 shadow-lg shadow-primary/20 flex items-center justify-center min-h-[60px]"
                      >
                        {saving ? <div className="spinner" /> : 'Save Changes'}
                      </button>
                  </div>
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
