'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { X, Bold, Italic, Underline, Search, Repeat } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import Sidebar from '@/components/Sidebar'
import Navigation from '@/components/Navigation'
import AuthGuard from '@/components/AuthGuard'
import Avatar from '@/components/Avatar'

const MAX_CHARS = 512

export default function EditPage() {
  const params = useParams()
  const router = useRouter()
  const { user, profile } = useAuthStore()
  
  const [content, setContent] = useState('')
  const [hashtags, setHashtags] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [previewData, setPreviewData] = useState<any>(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Fetch target post data
  useEffect(() => {
    async function fetchPost() {
      const slugStr = params.slug as string
      // If it's a UUID, use it directly, otherwise try to extract it from a slug
      const postId = slugStr.includes('-') && slugStr.length >= 36 ? slugStr : slugStr.split('-').pop()
      if (!postId) return

      const { data, error } = await supabase
        .from('posts')
        .select('*')
        .eq('id', postId)
        .single()

      if (error || !data) {
        setError('Post not found.')
        setLoading(false)
        return
      }

      setContent(data.content || '')
      setHashtags(Array.isArray(data.hashtags) ? data.hashtags.join(', ') : '')
      setLoading(false)
    }

    fetchPost()
  }, [params.slug])

  const extractSpotifyId = (url: string) => {
    const match = url.match(/https?:\/\/open\.spotify\.com\/(track|album|playlist)\/([a-zA-Z0-9]+)/)
    if (!match) return null
    return { type: match[1], id: match[2] }
  }

  // Preview Logic
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
      const postId = (params.slug as string).split('-').pop()
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

  if (loading) return <div className="min-h-screen bg-white flex items-center justify-center">Loading...</div>

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
                <button onClick={() => router.back()} className="text-gray-500 hover:bg-gray-100 p-2 rounded-full transition-colors flex shrink-0">
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
                        <Bold className="w-5 h-5" />
                      </button>
                      <button type="button" onClick={() => insertFormat('italic')} className="p-2 rounded hover:bg-gray-100">
                        <Italic className="w-5 h-5" />
                      </button>
                      <button type="button" onClick={() => insertFormat('underline')} className="p-2 rounded hover:bg-gray-100">
                        <Underline className="w-5 h-5" />
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

                    <div className={`text-right text-xs mt-2 font-medium ${isOverLimit ? 'text-red-500' : 'text-gray-400'}`}>
                      {charCount}/{MAX_CHARS}
                    </div>

                    {/* Spotify/Link Preview */}
                    {(previewLoading || previewData) && (
                      <div className="mt-4 border border-gray-100 rounded-2xl overflow-hidden bg-white shadow-sm transition-all">
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
                                <Search className="w-3 h-3" /> {new URL(previewData.url).hostname.replace('www.', '')}
                              </div>
                              <h4 className="font-bold text-gray-900 text-[15px] line-clamp-1 group-hover:text-primary transition-colors">{previewData.title || 'Link Preview'}</h4>
                            </div>
                          </a>
                        )}
                      </div>
                    )}

                    <div className="mt-6 flex flex-col gap-2">
                      <label className="text-sm font-bold text-gray-900">Hashtags (comma separated)</label>
                      <input
                        type="text"
                        value={hashtags}
                        onChange={(e) => setHashtags(e.target.value)}
                        placeholder="e.g. keyyap, music, chill"
                        className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl focus:ring-0 focus:border-primary transition-all text-sm"
                      />
                    </div>

                    <div className="mt-8">
                      <button
                        onClick={handleUpdate}
                        disabled={saving || isOverLimit || !content.trim()}
                        className="w-full bg-primary text-white py-4 rounded-full font-bold text-lg hover:opacity-90 transition-all disabled:opacity-50 shadow-lg shadow-primary/20"
                      >
                        {saving ? 'Updating...' : 'Save Changes'}
                      </button>
                    </div>
                  </div>
                </form>
              </div>
            </main>
          </div>
        </div>
        <Navigation />
      </div>
    </AuthGuard>
  )
}
