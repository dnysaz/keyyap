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
import Avatar from '@/components/Avatar'
import LocationInput from '@/components/LocationInput'
import LinkPreviewCard from '@/components/LinkPreviewCard'

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
  const [followedUsers, setFollowedUsers] = useState<any[]>([])
  const [mentionSearch, setMentionSearch] = useState('')
  const [showMentionSuggestions, setShowMentionSuggestions] = useState(false)
  const [highlightedIndex, setHighlightedIndex] = useState(0)
  const [location, setLocation] = useState<{name: string, lat: number, lng: number} | null>(null)
  const textareaRef = useEffect(() => {
    // We'll use a local ref or query selector as already used in insertFormat
  }, [])

  const charCount = content.length
  const isOverLimit = charCount > MAX_CHARS

  // Load draft from localStorage on mount
  useEffect(() => {
    const savedContent = localStorage.getItem('draft-post-content')
    const savedHashtags = localStorage.getItem('draft-post-hashtags')
    if (savedContent) setContent(savedContent)
    if (savedHashtags) setHashtags(savedHashtags)
  }, [])

  // Auto-save draft to localStorage whenever content or hashtags change
  useEffect(() => {
    if (content) localStorage.setItem('draft-post-content', content)
    else localStorage.removeItem('draft-post-content')
    
    if (hashtags) localStorage.setItem('draft-post-hashtags', hashtags)
    else localStorage.removeItem('draft-post-hashtags')
  }, [content, hashtags])

  useEffect(() => {
    fetchTrendingTags()
    fetchFollowing()
  }, [user])

  async function fetchFollowing() {
    if (!user) return
    const { data } = await supabase
      .from('follows')
      .select(`
        following:following_id (
          id,
          username,
          full_name,
          avatar_url
        )
      `)
      .eq('follower_id', user.id)
    
    if (data) {
      setFollowedUsers(data.map((f: any) => f.following))
    }
  }

  // Detect URL and fetch preview
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

  const extractSpotifyId = (url: string) => {
    const match = url.match(/https?:\/\/open\.spotify\.com\/(track|album|playlist)\/([a-zA-Z0-9]+)/)
    if (!match) return null
    return { type: match[1], id: match[2] }
  }

  const handleAppendTag = (tag: string) => {
    const currentTags = hashtags.split(',').map(t => t.trim()).filter(t => t)
    if (!currentTags.includes(tag)) {
      setHashtags(currentTags.length > 0 ? `${currentTags.join(', ')}, ${tag}` : tag)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value
    setContent(val)
    
    const words = val.split(/[\s\n]/)
    const lastWord = words[words.length - 1]
    
    if (lastWord.startsWith('@') && lastWord.length >= 2) {
      setMentionSearch(lastWord.substring(1))
      setShowMentionSuggestions(true)
      setHighlightedIndex(0)
    } else {
      setShowMentionSuggestions(false)
    }
  }

  const insertMention = (selectedUser: any) => {
    const parts = content.split(' ')
    const lastPart = parts[parts.length - 1]
    if (lastPart.startsWith('@')) {
      parts[parts.length - 1] = `@${selectedUser.username} `
      setContent(parts.join(' '))
    }
    setShowMentionSuggestions(false)
  }

  const filteredMentions = followedUsers.filter(u => 
    u.username.toLowerCase().includes(mentionSearch.toLowerCase()) || 
    (u.full_name && u.full_name.toLowerCase().includes(mentionSearch.toLowerCase()))
  )

  const handleCreateKeyDown = (e: React.KeyboardEvent) => {
    if (showMentionSuggestions && filteredMentions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setHighlightedIndex(prev => (prev + 1) % filteredMentions.length)
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setHighlightedIndex(prev => (prev - 1 + filteredMentions.length) % filteredMentions.length)
      } else if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault()
        insertMention(filteredMentions[highlightedIndex])
      } else if (e.key === 'Escape') {
        setShowMentionSuggestions(false)
      }
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
        location_name: location?.name || null,
        location_lat: location?.lat || null,
        location_lng: location?.lng || null,
      })

      if (postError) {
        setError(postError.message)
        setLoading(false)
        return
      }

      // Clear drafts on success
      localStorage.removeItem('draft-post-content')
      localStorage.removeItem('draft-post-hashtags')

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
            <main className="flex-1 max-w-2xl border-x border-gray-100 min-h-screen pb-32 relative">
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
                    <div className="relative">
                      {/* Minimalist Mention Suggestions UI */}
                      {showMentionSuggestions && filteredMentions.length > 0 && (
                        <div className="absolute bottom-full left-0 right-0 w-full mb-2 pointer-events-auto z-50">
                          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden animate-in fade-in slide-in-from-bottom-1 duration-200 uppercase tracking-tight">
                            <div className="max-h-[220px] overflow-y-auto py-1">
                              {filteredMentions.map((suggestion, idx) => (
                                <button
                                  key={suggestion.id}
                                  type="button"
                                  onClick={() => insertMention(suggestion)}
                                  onMouseEnter={() => setHighlightedIndex(idx)}
                                  className={`w-full flex items-center gap-3 p-2.5 px-4 transition-colors ${idx === highlightedIndex ? 'bg-gray-50' : 'hover:bg-gray-50/50'}`}
                                >
                                  <Avatar url={suggestion.avatar_url} username={suggestion.username} size="xs" />
                                  <div className="text-left flex-1 min-w-0">
                                    <div className="font-bold text-[13px] text-gray-900 truncate normal-case">{suggestion.full_name || suggestion.username}</div>
                                    <div className="text-[11px] text-gray-400 truncate mt-0.5 normal-case">@{suggestion.username}</div>
                                  </div>
                                </button>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                      <textarea
                        value={content}
                        onChange={handleInputChange}
                        onKeyDown={handleCreateKeyDown}
                        placeholder="Ready for yapping?"
                        className="w-full h-48 py-2 border-0 focus:border-transparent focus:ring-0 resize-none outline-none bg-transparent placeholder:text-gray-400 text-lg"
                        maxLength={MAX_CHARS + 20}
                      />
                    </div>

                    {/* Unified Link Preview */}
                    {(() => {
                      const urlRegex = /(https?:\/\/[^\s]+)/
                      const match = content.match(urlRegex)
                      if (!match) return null
                      return (
                        <div className="mt-4 pointer-events-none">
                          <div className="pointer-events-auto">
                            <LinkPreviewCard url={match[0]} />
                          </div>
                        </div>
                      )
                    })()}

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

                    <div className="pt-6 border-t border-gray-50">
                      <LocationInput onSelect={setLocation} />
                    </div>

                  <button
                    type="submit"
                    disabled={loading || isOverLimit || !content.trim()}
                    className="w-full bg-primary text-white py-4 rounded-full font-black text-lg hover:shadow-lg hover:shadow-primary/20 hover:-translate-y-0.5 transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none mt-4 flex items-center justify-center min-h-[60px]"
                  >
                    {loading ? <div className="spinner" /> : 'Create Post'}
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