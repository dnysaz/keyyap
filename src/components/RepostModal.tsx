'use client'

import { useState, useRef, useEffect } from 'react'
import { X, Bold, Italic, Underline, Globe, MessageCircle, TrendingUp, Link as LinkIcon } from 'lucide-react'
import Avatar from './Avatar'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import { useRouter } from 'next/navigation'

interface RepostModalProps {
  isOpen: boolean
  onClose: () => void
  originalPost: any
  onSuccess?: () => void
}

interface LinkMetadata {
  url: string
  title?: string
  description?: string
  image?: string
  domain?: string
}

const MAX_CHARS = 512

export default function RepostModal({ isOpen, onClose, originalPost, onSuccess }: RepostModalProps) {
  const { profile } = useAuthStore()
  const [content, setContent] = useState('')
  const [hashtags, setHashtags] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [linkMeta, setLinkMeta] = useState<LinkMetadata | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const router = useRouter()

  const charCount = content.length
  const isOverLimit = charCount > MAX_CHARS

  // Check for links in original post content to show preview
  useEffect(() => {
    if (originalPost?.content) {
      const urls = originalPost.content.match(/https?:\/\/[^\s]+/g) || []
      if (urls.length > 0) {
        fetch(`/api/link-preview?urls=${encodeURIComponent(urls[0])}`)
          .then((res) => res.json())
          .then((data) => {
            if (data.links && data.links[0]) setLinkMeta(data.links[0])
          })
          .catch(console.error)
      }
    }
  }, [originalPost])

  useEffect(() => {
    if (isOpen && textareaRef.current) {
      textareaRef.current.focus()
      // Lock scroll when modal is open
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => { document.body.style.overflow = 'unset' }
  }, [isOpen])

  if (!isOpen) return null

  const handleRepost = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!profile) return
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
        hashtags: tagsArr.length > 0 ? tagsArr : null
      })

      if (postError) throw postError

      // Also mark as repost in notifications
      if (profile.id !== originalPost.user_id) {
        await supabase.from('notifications').insert({
          type: 'repost',
          user_id: originalPost.user_id,
          from_user_id: profile.id,
          post_id: originalPost.id
        })
      }

      onSuccess?.()
      onClose()
      setContent('')
      setHashtags('')
    } catch (err: any) {
      setError(err.message)
    } finally {
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

  function extractDomain(url: string): string {
    try {
      return new URL(url).hostname.replace('www.', '')
    } catch { return url }
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4 animate-in fade-in duration-200">
      <div 
        className="bg-white w-full h-full sm:h-auto sm:max-w-2xl sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header - Styled like Create Page */}
        <div className="sticky top-0 bg-white/80 backdrop-blur-md z-10 px-4 py-3 border-b border-gray-100 flex items-center justify-between">
          <button onClick={onClose} className="p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors">
            <X className="w-6 h-6 text-gray-900" />
          </button>
          <h1 className="text-lg font-bold">Quote Post</h1>
          <button
            onClick={handleRepost}
            disabled={loading || isOverLimit}
            className="bg-primary text-white px-6 py-2 rounded-full font-bold text-[15px] hover:opacity-90 transition-all disabled:opacity-50 shadow-md"
          >
            {loading ? 'Reposting...' : 'Post'}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
          <div className="flex gap-4">
            <Avatar url={profile?.avatar_url || undefined} username={profile?.username} size="md" />
            <div className="flex-1 min-w-0">
              {error && <div className="mb-4 bg-red-50 text-red-600 p-3 rounded-xl text-sm font-medium border border-red-100">{error}</div>}
              
              <div className="flex gap-1 mb-2">
                <button type="button" onClick={() => insertFormat('bold')} className="p-2 rounded-lg hover:bg-gray-100 text-gray-600 transition-colors">
                  <Bold className="w-5 h-5" />
                </button>
                <button type="button" onClick={() => insertFormat('italic')} className="p-2 rounded-lg hover:bg-gray-100 text-gray-600 transition-colors">
                  <Italic className="w-5 h-5" />
                </button>
                <button type="button" onClick={() => insertFormat('underline')} className="p-2 rounded-lg hover:bg-gray-100 text-gray-600 transition-colors">
                  <Underline className="w-5 h-5" />
                </button>
              </div>

              <textarea
                ref={textareaRef}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Add a comment..."
                className="w-full min-h-[140px] pt-1 text-xl text-gray-900 placeholder:text-gray-400 bg-transparent border-none focus:ring-0 resize-none leading-relaxed"
                maxLength={MAX_CHARS + 50}
              />

              <div className={`text-right text-xs mt-2 font-medium ${isOverLimit ? 'text-red-500' : 'text-gray-400'}`}>
                {charCount}/{MAX_CHARS}
              </div>

              {/* Original Post Preview with Link Support */}
              <div className="mt-6 border border-gray-200 rounded-2xl overflow-hidden shadow-sm bg-white border-l-4 border-l-primary">
                <div className="p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Avatar url={originalPost.profiles?.avatar_url || undefined} username={originalPost.profiles?.username} size="xs" />
                    <span className="font-bold text-sm text-gray-900">
                      {originalPost.profiles?.full_name || originalPost.profiles?.username}
                    </span>
                    <span className="text-gray-500 text-sm">@{originalPost.profiles?.username}</span>
                  </div>
                  <p className="text-[15px] text-gray-800 line-clamp-3 whitespace-pre-wrap leading-normal mb-1">{originalPost.content}</p>
                  
                  {/* Preview Hashtags */}
                  {originalPost.hashtags && Array.isArray(originalPost.hashtags) && originalPost.hashtags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-2">
                      {originalPost.hashtags.map((tag: string) => (
                        <span key={tag} className="text-primary text-[13px]">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Link Preview in Original Post */}
                {linkMeta && (
                  <div className="px-4 pb-4">
                    <div className="rounded-xl border border-gray-100 overflow-hidden bg-white shadow-sm flex items-stretch h-20">
                      {linkMeta.image && (
                        <div className="w-24 shrink-0">
                          <img src={linkMeta.image} className="w-full h-full object-cover" alt="" />
                        </div>
                      )}
                      <div className="p-2 px-3 flex-1 min-w-0 flex flex-col justify-center">
                        <h4 className="font-bold text-gray-900 text-[13px] truncate">{linkMeta.title}</h4>
                        <p className="text-[11px] text-gray-500 line-clamp-1 mt-0.5 uppercase font-bold tracking-wider underline">{extractDomain(linkMeta.url)}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Hashtags section like Create Page */}
              <div className="mt-8 pt-6 border-t border-gray-100">
                <label className="block text-sm font-bold text-gray-700 mb-2">
                  Hashtags (optional)
                </label>
                <input
                  type="text"
                  value={hashtags}
                  onChange={(e) => setHashtags(e.target.value)}
                  placeholder="e.g. introvert, daily"
                  className="w-full px-4 py-3 bg-gray-50 border border-transparent rounded-xl focus:bg-white focus:border-primary transition-all outline-none text-sm"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
