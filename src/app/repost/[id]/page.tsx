'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { X, Bold, Italic, Underline, TrendingUp, Link as LinkIcon, Repeat, ArrowLeft, Play } from 'lucide-react'
import Sidebar from '@/components/Sidebar'
import RightSidebar from '@/components/RightSidebar'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import Avatar from '@/components/Avatar'
import Navigation from '@/components/Navigation'
import AuthGuard from '@/components/AuthGuard'
import LocationInput from '@/components/LocationInput'
import LinkPreviewCard from '@/components/LinkPreviewCard'

const MAX_CHARS = 512

interface LinkMetadata {
  url: string
  title?: string
  description?: string
  image?: string
  domain?: string
}

export default function RepostPage() {
  const router = useRouter()
  const { id } = useParams()
  const { profile, loading: authLoading } = useAuthStore()
  
  const [originalPost, setOriginalPost] = useState<any>(null)
  const [content, setContent] = useState('')
  const [hashtags, setHashtags] = useState('')
  const [loading, setLoading] = useState(false)
  const [fetchingPost, setFetchingPost] = useState(true)
  const [error, setError] = useState('')
  const [linkMeta, setLinkMeta] = useState<LinkMetadata | null>(null)
  const [location, setLocation] = useState<{name: string, lat: number, lng: number} | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const [followedUsers, setFollowedUsers] = useState<any[]>([])
  const [mentionSearch, setMentionSearch] = useState('')
  const [showMentionSuggestions, setShowMentionSuggestions] = useState(false)
  const [highlightedIndex, setHighlightedIndex] = useState(0)

  const charCount = content.length
  const isOverLimit = charCount > MAX_CHARS

  useEffect(() => {
    if (id) {
      fetchOriginalPost()
      fetchFollowing()
    }
  }, [id, profile])

  async function fetchFollowing() {
    if (!profile) return
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
      .eq('follower_id', profile.id)
    
    if (data) {
      setFollowedUsers(data.map((f: any) => f.following))
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

  async function fetchOriginalPost() {
    setFetchingPost(true)
    try {
      const { data, error } = await supabase
        .from('posts')
        .select('*, profiles(*)')
        .eq('id', id)
        .single()
      
      if (error) throw error
      setOriginalPost(data)

      // Fetch link preview for original post
      const urls = data.content.match(/https?:\/\/[^\s]+/g) || []
      if (urls.length > 0) {
        fetch(`/api/link-preview?urls=${encodeURIComponent(urls[0])}`)
          .then(res => res.json())
          .then(metaData => {
            if (metaData.links && metaData.links[0]) setLinkMeta(metaData.links[0])
          })
      }
    } catch (err) {
      console.error(err)
      setError('Failed to fetch original post.')
    } finally {
      setFetchingPost(false)
    }
  }

  const handleRepost = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!profile || !originalPost) return
    if (isOverLimit) return

    setLoading(true)
    setError('')

    const tagsArr = hashtags
      .split(',')
      .map((t) => t.trim().toLowerCase().replace(/^#/, ''))
      .filter((t) => t.length > 0)

    try {
      const { error: postError } = await supabase.from('posts').insert({
        user_id: profile.id,
        content: content.trim(),
        quoted_post_id: originalPost.id,
        hashtags: tagsArr.length > 0 ? tagsArr : null,
        location_name: location?.name || null,
        location_lat: location?.lat || null,
        location_lng: location?.lng || null,
      })

      if (postError) throw postError

      router.push('/')
    } catch (err: any) {
      setError(err.message)
      setLoading(false)
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
    setTimeout(() => {
      textarea.focus()
      textarea.setSelectionRange(start + (wrapper === 'bold' ? 2 : wrapper === 'italic' ? 1 : 2), end + (wrapper === 'bold' ? 2 : wrapper === 'italic' ? 1 : 2))
    }, 0)
  }

  function formatContent(content: string) {
    if (!content) return null
    return content.split('\n').map((line, i) => {
      const parts = line.split(/(https?:\/\/[^\s]+)/g)
      return (
        <span key={i} className="block min-h-[1.2em]">
          {parts.map((part, j) => {
            if (part.match(/^https?:\/\/[^\s]+$/)) {
              return (
                <a key={j} href={part} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-medium">
                  {part.length > 40 ? part.substring(0, 40) + '...' : part}
                </a>
              )
            }
            return part
          })}
        </span>
      )
    })
  }

  function extractDomain(url: string): string {
    try {
      return new URL(url).hostname.replace('www.', '')
    } catch { return url }
  }

  return (
    <AuthGuard>
      <div className="min-h-screen bg-white">
        <Sidebar />
        <div className="lg:ml-[68px] xl:ml-[275px] flex justify-center">
          <div className="flex w-full max-w-[1050px]">
            <main className="flex-1 max-w-2xl border-x border-gray-100 min-h-screen pb-32 relative bg-white">
              {/* Header - Identical to Create Page */}
              <div className="sticky top-0 bg-white/80 backdrop-blur-md z-10 px-4 py-3 border-b border-gray-50 flex items-center justify-between">
                <button onClick={() => router.back()} className="text-gray-500 hover:bg-gray-100 p-2 rounded-full transition-colors flex shrink-0">
                  <ArrowLeft className="w-6 h-6" />
                </button>
                <h1 className="text-lg font-bold">Repost</h1>
                <div className="w-10" />
              </div>

              {fetchingPost ? (
                <div className="p-8 text-center text-gray-500 animate-pulse font-medium">Sinking original post...</div>
              ) : error ? (
                <div className="p-8 text-center text-red-500 font-medium">{error}</div>
              ) : (
                <div className="px-4 py-6">
                  <form onSubmit={handleRepost} className="space-y-6">
                    <div>
                      <div className="flex gap-2 mb-4">
                        <button type="button" onClick={() => insertFormat('bold')} className="p-2.5 rounded-xl hover:bg-gray-100 text-gray-600 transition-all border border-transparent hover:border-gray-200" title="Bold">
                          <Bold className="w-5 h-5" />
                        </button>
                        <button type="button" onClick={() => insertFormat('italic')} className="p-2.5 rounded-xl hover:bg-gray-100 text-gray-600 transition-all border border-transparent hover:border-gray-200" title="Italic">
                          <Italic className="w-5 h-5" />
                        </button>
                        <button type="button" onClick={() => insertFormat('underline')} className="p-2.5 rounded-xl hover:bg-gray-100 text-gray-600 transition-all border border-transparent hover:border-gray-200" title="Underline">
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
                          ref={textareaRef}
                          value={content}
                          onChange={handleInputChange}
                          onKeyDown={handleCreateKeyDown}
                          placeholder="Add a comment to this post..."
                          className="w-full h-40 py-2 border-0 focus:border-transparent focus:ring-0 resize-none text-lg outline-none bg-transparent placeholder:text-gray-300 transition-all font-medium"
                          autoFocus
                          maxLength={MAX_CHARS + 20}
                        />
                      </div>
                      <div className={`text-right text-xs mt-2 font-bold tracking-tight ${isOverLimit ? 'text-red-500' : 'text-gray-300'}`}>
                        {charCount} / {MAX_CHARS}
                      </div>
                    </div>

                    <div className="pt-6 border-t border-gray-50">
                      <LocationInput onSelect={setLocation} />
                    </div>

                    {/* Original Post Section - Flat and integrated */}
                    <div className="border border-gray-100 rounded-[24px] overflow-hidden bg-gray-50/20 active:scale-[0.99] transition-transform">
                      <div className="p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <Avatar url={originalPost.profiles?.avatar_url} username={originalPost.profiles?.username} size="xs" />
                          <span className="font-bold text-[13px] text-gray-900">
                            {originalPost.profiles?.full_name || originalPost.profiles?.username}
                          </span>
                          <span className="text-gray-400 text-[13px]">@{originalPost.profiles?.username}</span>
                        </div>
                        <div className="text-[15px] text-gray-700 leading-relaxed font-medium">
                          {formatContent(originalPost.content)}
                        </div>
                      </div>

                      {/* Link Preview in Original Post */}
                      {(() => {
                        const urls = originalPost.content?.match(/(https?:\/\/[^\s]+)/g) || []
                        if (urls.length === 0) return null;
                        const uniqueUrls = Array.from(new Set(urls)) as string[]
                        return (
                          <div className="border-t border-gray-100 bg-white p-3 space-y-2">
                             {uniqueUrls.map((u, i) => <LinkPreviewCard key={`repost-${i}`} url={u} />)}
                          </div>
                        )
                      })()}
                    </div>

                    <div className="pt-8 border-t border-gray-50">
                      <label className="block text-xs font-black text-gray-300 mb-2 uppercase tracking-[0.2em]">
                        Hashtags
                      </label>
                      <input
                        type="text"
                        value={hashtags}
                        onChange={(e) => setHashtags(e.target.value)}
                        placeholder="e.g. yapping, daily"
                        className="w-full py-2 border-0 focus:border-transparent focus:ring-0 outline-none bg-transparent text-lg text-gray-500 placeholder:text-gray-200"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={loading || isOverLimit}
                      className="w-full bg-primary text-white py-4 rounded-full font-bold text-lg hover:opacity-90 transition-all disabled:opacity-20 shadow-none mt-4"
                    >
                      {loading ? 'Posting...' : 'Post Repost'}
                    </button>
                  </form>
                </div>
              )}
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
