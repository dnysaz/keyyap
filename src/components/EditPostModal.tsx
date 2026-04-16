'use client'

import { useState, useEffect, useRef } from 'react'
import { X, Bold, Italic, Underline, Search } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import Avatar from './Avatar'

interface EditPostModalProps {
  isOpen: boolean
  onClose: () => void
  post: any
  onSuccess?: () => void
}

const MAX_CHARS = 512

export default function EditPostModal({ isOpen, onClose, post, onSuccess }: EditPostModalProps) {
  const [content, setContent] = useState(post.content || '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [previewData, setPreviewData] = useState<any>(null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (isOpen) {
      setContent(post.content || '')
      setTimeout(() => textareaRef.current?.focus(), 100)
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = 'unset'
    }
    return () => { document.body.style.overflow = 'unset' }
  }, [isOpen, post.content])

  const extractSpotifyId = (url: string) => {
    const match = url.match(/https?:\/\/open\.spotify\.com\/(track|album|playlist)\/([a-zA-Z0-9]+)/)
    if (!match) return null
    return { type: match[1], id: match[2] }
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

  if (!isOpen) return null

  const handleUpdate = async () => {
    if (!content.trim() || loading) return
    setLoading(true)
    setError('')

    try {
      const { error: updateError } = await supabase
        .from('posts')
        .update({ 
          content: content.trim(),
          updated_at: new Date().toISOString()
        })
        .eq('id', post.id)

      if (updateError) throw updateError

      onSuccess?.()
      onClose()
      window.location.reload()
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
      textarea.setSelectionRange(start + (wrapper === 'bold' ? 2 : 2), end + (wrapper === 'bold' ? 2 : 2))
    }, 0)
  }

  const charCount = content.length
  const isOverLimit = charCount > MAX_CHARS

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4 animate-in fade-in duration-200">
      <div 
        className="bg-white w-full h-full sm:h-auto sm:max-w-2xl sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header - Identical to CreatePage */}
        <div className="sticky top-0 bg-white/80 backdrop-blur-md z-10 px-4 py-3 border-b border-gray-50 flex items-center justify-between">
          <button onClick={onClose} className="p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors flex shrink-0">
            <X className="w-6 h-6 text-gray-900" />
          </button>
          <h1 className="text-lg font-bold">Edit Post</h1>
          <button
            onClick={handleUpdate}
            disabled={loading || isOverLimit || !content.trim()}
            className="bg-primary text-white px-6 py-1.5 rounded-full font-bold text-[15px] hover:opacity-90 transition-all disabled:opacity-50 shadow-md"
          >
            {loading ? 'Saving...' : 'Save'}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 py-6">
          <div className="max-w-xl mx-auto">
            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-4">
                {error}
              </div>
            )}

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

            {/* Link/Spotify Preview - Consistency with CreatePage */}
            {(previewLoading || previewData) && (
              <div className="mt-4 border border-gray-100 rounded-2xl overflow-hidden bg-white shadow-sm transition-all">
                {previewLoading ? (
                  <div className="w-full py-8 text-center text-xs text-gray-400 font-medium tracking-widest animate-pulse uppercase">
                    Fetching preview...
                  </div>
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
                      <div className="w-full h-48 relative overflow-hidden bg-gray-50 border-b border-gray-50">
                        <img src={previewData.image} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                      </div>
                    )}
                    <div className="p-4 flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 text-[12px] text-gray-500 mb-1">
                        <Search className="w-3 h-3" /> {new URL(previewData.url).hostname.replace('www.', '')}
                      </div>
                      <h4 className="font-bold text-gray-900 text-[15px] line-clamp-1 group-hover:text-primary transition-colors">
                        {previewData.title || 'Link Preview'}
                      </h4>
                    </div>
                  </a>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
