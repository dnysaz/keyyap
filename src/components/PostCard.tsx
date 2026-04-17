'use client'

import { useState, useEffect, useRef } from 'react'
import { Heart, MessageCircle, Repeat, ExternalLink, Link as LinkIcon, Check, MoreVertical, Edit2, Trash2, Play, ExternalLink as ExternalLinkIcon, MapPin } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import type { Post, Profile } from '@/types'
import Avatar from './Avatar'
import { getSlug, formatDate } from '@/lib/utils'

interface PostCardProps {
  post: Post
  currentUserId?: string
  onLikeChange?: (postId: string, isLiked: boolean, newCount: number) => void
  reposterUsername?: string
}

interface LinkMetadata {
  url: string
  title?: string
  description?: string
  image?: string
  domain?: string
}

function extractYoutubeId(url: string): string | null {
  const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\s]+)/)
  return match ? match[1] : null
}

function extractSpotifyId(url: string) {
  const match = url.match(/https?:\/\/open\.spotify\.com\/(track|album|playlist)\/([a-zA-Z0-9]+)/)
  if (!match) return null
  return { type: match[1], id: match[2] }
}

function extractDomain(url: string): string {
  try {
    const domain = new URL(url).hostname
    return domain.replace('www.', '')
  } catch {
    return url
  }
}

export default function PostCard({ post, currentUserId, onLikeChange, reposterUsername }: PostCardProps) {
  const router = useRouter()
  const [isLiked, setIsLiked] = useState(post.is_liked || false)
  const [likesCount, setLikesCount] = useState(post.likes_count || 0)
  const [repostCount, setRepostCount] = useState(post.shares_count || 0)
  const [isReposted, setIsReposted] = useState(false)
  const [linkMetas, setLinkMetas] = useState<LinkMetadata[]>([])
  const [isLoadingLike, setIsLoadingLike] = useState(false)
  const [isLoadingRepost, setIsLoadingRepost] = useState(false)
  const [expandedVideo, setExpandedVideo] = useState<string | null>(null)
  const [showFull, setShowFull] = useState(false)
  const [showMenu, setShowMenu] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  const TRUNCATE_LENGTH = 160
  const urls = post.content.match(/https?:\/\/[^\s]+/g) || []

  // Close menu on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowMenu(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Check if current user liked/reposted
  useEffect(() => {
    if (!currentUserId) return
    
    const checkStatus = async () => {
      const [likeRes, repostRes] = await Promise.all([
        supabase.from('post_likes').select('id').eq('post_id', post.id).eq('user_id', currentUserId).maybeSingle(),
        supabase.from('reposts').select('id').eq('original_post_id', post.id).eq('user_id', currentUserId).maybeSingle()
      ])
      setIsLiked(!!likeRes.data)
      setIsReposted(!!repostRes.data)
    }
    
    checkStatus()
  }, [post.id, currentUserId])

  // Extra: handle quoted post urls
  const qpRaw = post.quoted_post
  const qp = Array.isArray(qpRaw) ? qpRaw[0] : qpRaw
  const qpUrls = qp?.content?.match(/https?:\/\/[^\s]+/g) || []



  // Fetch link previews for main post
  useEffect(() => {
    if (urls.length > 0) {
      fetch(`/api/link-preview?urls=${encodeURIComponent(urls.join(','))}`)
        .then(async (res) => {
          if (!res.ok) return { links: [] }
          const contentType = res.headers.get('content-type')
          if (contentType && contentType.includes('application/json')) {
            return res.json()
          }
          return { links: [] }
        })
        .then((data) => setLinkMetas(data.links || []))
        .catch(err => console.error('Link preview error:', err))
    }
  }, [urls.join(',')])

  // Fetch link previews for quoted post
  const [quotedLinkMetas, setQuotedLinkMetas] = useState<LinkMetadata[]>([])
  useEffect(() => {
    if (qpUrls.length > 0) {
      fetch(`/api/link-preview?urls=${encodeURIComponent(qpUrls.join(','))}`)
        .then(async (res) => {
          if (!res.ok) return { links: [] }
          const contentType = res.headers.get('content-type')
          if (contentType && contentType.includes('application/json')) {
            return res.json()
          }
          return { links: [] }
        })
        .then((data) => setQuotedLinkMetas(data.links || []))
        .catch(err => console.error('Quoted link preview error:', err))
    }
  }, [qpUrls.join(',')])

  const handleLike = async () => {
    if (!currentUserId) {
      router.push('/login')
      return
    }
    if (isLoadingLike) return

    setIsLoadingLike(true)
    const wasLiked = isLiked
    const newLiked = !isLiked
    const newCount = newLiked ? likesCount + 1 : Math.max(0, likesCount - 1)
    
    // UI Update (Optimistic)
    setIsLiked(newLiked)
    setLikesCount(newCount)
    if (onLikeChange) onLikeChange(post.id, newLiked, newCount)

    try {
      if (newLiked) {
        // Use upsert to be safe against double-clicks/race conditions
        await supabase.from('post_likes').upsert({ post_id: post.id, user_id: currentUserId }, { onConflict: 'user_id,post_id' })
      } else {
        await supabase.from('post_likes').delete().eq('post_id', post.id).eq('user_id', currentUserId)
      }
    } catch (err) {
      console.error('Like error:', err)
      // Rollback on error
      setIsLiked(wasLiked)
      setLikesCount(likesCount)
    } finally {
      setIsLoadingLike(false)
    }
  }

  const handleRepost = () => {
    router.push(`/repost/${post.id}`)
  }

  const handleDelete = async () => {
    try {
      const { error } = await supabase
        .from('posts')
        .update({ is_deleted: true })
        .eq('id', post.id)
        .eq('user_id', currentUserId) // Safety check: ensure user owns the post

      if (error) {
        if (error.code === '42501') {
          alert('Permission denied. Please ensure you are logged in and own this post.')
        } else {
          throw error
        }
        return
      }
      
      window.location.reload()
    } catch (err) {
      alert('Failed to delete post.')
      console.error(err)
    }
  }

  const handleEdit = () => {
    router.push(`/u/${post.profiles?.username}/${post.id}/edit`)
    setShowMenu(false)
  }


  function formatContent(content: string) {
    if (!content) return null
    // Detect URLs and Mentions and wrap in <a> tags
    let formatted = content
      .replace(/(https?:\/\/[^\s]+)/g, (url) => {
        const displayUrl = url.length > 40 ? url.substring(0, 40) + '...' : url
        return `<a href="${url}" target="_blank" rel="noopener noreferrer" class="text-primary hover:underline font-medium">${displayUrl}</a>`
      })
      .replace(/@(\w+)/g, (mention) => {
        const username = mention.substring(1)
        return `<a href="/u/${username}" class="text-primary hover:underline font-bold">@${username}</a>`
      })
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/__(.+)__/g, '<u>$1</u>')
    
    return formatted.split('\n').map((line, i) => (
      <span key={i} className="block min-h-[1.2em]">
        <span dangerouslySetInnerHTML={{ __html: line }} />
      </span>
    ))
  }

  const displayedContent = showFull || post.content.length <= TRUNCATE_LENGTH ? post.content : post.content.slice(0, TRUNCATE_LENGTH) + '...'

  return (
    <div className="bg-white border-b border-gray-100 hover:bg-gray-50/30 transition-all px-4 py-8 md:py-10 relative group">
      {reposterUsername && (
        <div className="flex items-center gap-2 mb-2 ml-[45px] overflow-hidden">
          <Repeat className="w-3.5 h-3.5 text-gray-500 shrink-0" />
          <span className="text-[13px] font-bold text-gray-500 hover:underline cursor-pointer truncate">
            {reposterUsername === post.profiles?.username ? 'You' : reposterUsername} reposted
          </span>
        </div>
      )}

      <div className="flex gap-3">
        <Link href={`/u/${post.profiles?.username}`} className="shrink-0 pt-0.5">
          <Avatar url={post.profiles?.avatar_url || undefined} username={post.profiles?.username} size="md" />
        </Link>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 min-w-0 flex-wrap">
              <Link href={`/u/${post.profiles?.username}`} className="font-bold text-[15px] text-gray-900 hover:underline truncate">
                {post.profiles?.full_name || post.profiles?.username}
              </Link>
              <span className="text-gray-500 text-[15px] truncate">@{post.profiles?.username}</span>
              <span className="text-gray-400 text-[15px]">· {formatDate(post.created_at)}</span>
              {post.location_name && (
                <Link 
                  href={`/search?location=${encodeURIComponent(post.location_name)}`} 
                  className="flex items-center gap-1 text-primary hover:underline text-[13px] font-medium ml-1 bg-primary/5 px-2 py-0.5 rounded-full"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MapPin className="w-3 h-3" />
                  <span className="truncate max-w-[150px]">{post.location_name.split(',')[0]}</span>
                </Link>
              )}
            </div>
            
            <div className="relative" ref={menuRef}>
              {(currentUserId === post.user_id) ? (
                <button 
                  onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu) }} 
                  className="p-2 -mr-2 hover:bg-primary/10 hover:text-primary rounded-full transition-colors text-gray-400"
                >
                  <MoreVertical className="w-4 h-4" />
                </button>
              ) : (
                <button 
                  onClick={(e) => { e.stopPropagation(); setShowMenu(!showMenu) }} 
                  className="p-2 -mr-2 hover:bg-primary/10 hover:text-primary rounded-full transition-colors opacity-0 group-hover:opacity-100 text-gray-400"
                >
                  <MoreVertical className="w-4 h-4" />
                </button>
              )}
              {showMenu && (
                <div className="absolute right-0 mt-1 w-40 bg-white rounded-xl shadow-2xl border border-gray-100 py-1 z-30 overflow-hidden ring-1 ring-black/5 animate-in fade-in zoom-in-95 duration-100">
                  {currentUserId === post.user_id && (
                    <>
                      <button onClick={handleEdit} className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 w-full transition-colors text-left">
                        <Edit2 className="w-4 h-4 text-gray-400" /> Edit Post
                      </button>
                      <button onClick={handleDelete} className="flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-gray-50 w-full transition-colors text-left font-medium">
                        <Trash2 className="w-4 h-4" /> Delete Post
                      </button>
                    </>
                  )}
                  {currentUserId !== post.user_id && (
                    <button className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50 w-full transition-colors text-left">
                      <ExternalLink className="w-4 h-4 text-gray-400" /> Share Post
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="mt-0.5 text-gray-900 text-[15px] leading-normal break-words whitespace-pre-wrap">
            {displayedContent && formatContent(displayedContent)}
            {post.content.length > TRUNCATE_LENGTH && (
              <button onClick={() => setShowFull(!showFull)} className="text-primary hover:underline ml-1 font-semibold">
                {showFull ? 'Show less' : 'Show more'}
              </button>
            )}
          </div>

          {/* Hashtags */}
          {post.hashtags && Array.isArray(post.hashtags) && post.hashtags.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {post.hashtags.map((tag: string) => (
                <Link key={tag} href={`/search?tag=${encodeURIComponent(tag)}`}>
                  <span className="text-primary text-[14px] hover:underline font-medium">#{tag}</span>
                </Link>
              ))}
            </div>
          )}

          {/* Link Previews */}
          {linkMetas.length > 0 && (
            <div className="mt-3 space-y-3">
              {linkMetas.map((link, idx) => {
                const youtubeId = extractYoutubeId(link.url)
                const isSpotify = extractSpotifyId(link.url)
                
                if (youtubeId) {
                  return (
                    <div key={idx} className="rounded-2xl overflow-hidden border border-gray-200 bg-black aspect-video relative group/video shadow-sm">
                      {expandedVideo === youtubeId ? (
                        <iframe
                          src={`https://www.youtube.com/embed/${youtubeId}?autoplay=1`}
                          className="w-full h-full"
                          allow="autoplay; encrypted-media"
                          allowFullScreen
                        />
                      ) : (
                        <div 
                          className="w-full h-full cursor-pointer relative"
                          onClick={() => setExpandedVideo(youtubeId)}
                        >
                          <img src={`https://img.youtube.com/vi/${youtubeId}/maxresdefault.jpg`} className="w-full h-full object-cover opacity-80" alt="" />
                          <div className="absolute inset-0 flex items-center justify-center bg-black/10 hover:bg-black/20 transition-colors">
                            <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center text-white shadow-2xl group-hover/video:scale-110 transition-transform">
                              <Play className="w-8 h-8 fill-current translate-x-1" />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )
                }

                if (isSpotify) return null // Handled below by a dedicated map for all urls
                
                return (
                  <a 
                    key={idx} 
                    href={link.url} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="block rounded-2xl border border-gray-200 overflow-hidden hover:bg-gray-50/50 transition-all group/link shadow-sm bg-white"
                  >
                    {link.image && (
                      <div className="w-full h-[280px] overflow-hidden">
                        <img src={link.image} className="w-full h-full object-cover group-hover/link:scale-105 transition-transform duration-500" alt="" />
                      </div>
                    )}
                    <div className="p-3.5 border-t border-gray-100">
                      <div className="flex items-center gap-1.5 text-[13px] text-gray-500 mb-1 Capitalize">
                        <LinkIcon className="w-3 h-3" /> {extractDomain(link.url)}
                      </div>
                      <h4 className="font-bold text-gray-900 text-[15px] line-clamp-1 group-hover/link:text-primary transition-colors">{link.title || link.url}</h4>
                      {link.description && <p className="text-[14px] text-gray-500 line-clamp-2 mt-1 leading-snug">{link.description}</p>}
                    </div>
                  </a>
                )
              })}
              
              {/* Spotify Previews */}
              {urls.map((url: string, idx: number) => {
                const spotify = extractSpotifyId(url)
                if (!spotify) return null
                return (
                  <div key={`spotify-${idx}`} className="rounded-xl overflow-hidden border border-gray-100 bg-white">
                    <iframe
                      src={`https://open.spotify.com/embed/${spotify.type}/${spotify.id}?utm_source=generator&theme=0`}
                      width="100%"
                      height={spotify.type === 'track' ? "80" : "152"}
                      frameBorder="0"
                      allowFullScreen
                      allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                      loading="lazy"
                      className="block"
                    />
                  </div>
                )
              })}
            </div>
          )}

          {/* Quoted Post Preview */}
          {(() => {
            const qpRaw = post.quoted_post
            const qp = Array.isArray(qpRaw) ? qpRaw[0] : qpRaw
            
            if (!qp || !qp.id) return null

            const qpProfileRaw = qp.profiles || (qp as any).profiles_user_id
            const qpProfile = Array.isArray(qpProfileRaw) ? qpProfileRaw[0] : qpProfileRaw

            return (
              <div className="mt-3 block border border-gray-200 rounded-2xl overflow-hidden hover:bg-gray-50/20 transition-all bg-white group/quote relative">
                <Link 
                  href={`/u/${qpProfile?.username || 'user'}/${getSlug(qp.id, qp.content || '')}`}
                  className="absolute inset-0 z-0"
                />
                <div className="p-3 px-4 relative z-10 pointer-events-none">
                  <div className="flex items-center gap-2 mb-1 pointer-events-auto">
                    <Link href={`/u/${qpProfile?.username}`}>
                      <Avatar url={qpProfile?.avatar_url || undefined} username={qpProfile?.username} size="xs" />
                    </Link>
                    <Link href={`/u/${qpProfile?.username}`} className="font-bold text-[14px] text-gray-900 hover:underline">
                      {qpProfile?.full_name || qpProfile?.username || 'Unknown User'}
                    </Link>
                    <span className="text-gray-500 text-[14px]">@{qpProfile?.username || 'unknown'}</span>
                    <span className="text-gray-400 text-[14px]">· {formatDate(qp.created_at)}</span>
                  </div>
                  <div className="text-[14px] text-gray-700 line-clamp-4 whitespace-pre-wrap leading-normal mb-1 pointer-events-auto break-words">{formatContent(qp.content || 'Content not available')}</div>
                  
                  {/* Quoted Hashtags */}
                  {qp.hashtags && Array.isArray(qp.hashtags) && qp.hashtags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-1 pointer-events-auto">
                      {qp.hashtags.map((tag: string) => (
                        <Link key={tag} href={`/search?tag=${encodeURIComponent(tag)}`} className="text-primary text-[12px] hover:underline">
                          #{tag}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>

                {/* Quoted Media Content */}
                {quotedLinkMetas.length > 0 && (
                  <div className="px-4 pb-3 space-y-2 relative z-10">
                    {quotedLinkMetas.map((link, idx) => {
                      const ytId = extractYoutubeId(link.url)
                      if (ytId) {
                        return (
                          <div key={idx} className="rounded-xl overflow-hidden border border-gray-100 bg-black aspect-video relative group/qp-video">
                            <img src={`https://img.youtube.com/vi/${ytId}/mqdefault.jpg`} className="w-full h-full object-cover opacity-80" alt="" />
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-auto">
                              <Link 
                                href={`/u/${qpProfile?.username || 'user'}/${getSlug(qp.id, qp.content || '')}`}
                                className="w-10 h-10 bg-primary/90 text-white rounded-full flex items-center justify-center hover:scale-110 transition-transform shadow-lg"
                              >
                                <Play className="w-5 h-5 fill-current translate-x-0.5" />
                              </Link>
                            </div>
                          </div>
                        )
                      }
                      return (
                        <div key={idx} className="rounded-xl border border-gray-100 overflow-hidden bg-white flex items-stretch h-16">
                          {link.image && (
                            <div className="w-20 shrink-0">
                              <img src={link.image} className="w-full h-full object-cover" alt="" />
                            </div>
                          )}
                          <div className="p-2 px-3 flex-1 min-w-0 flex flex-col justify-center">
                            <h4 className="font-bold text-gray-900 text-[13px] truncate">{link.title || link.url}</h4>
                            <p className="text-[10px] text-gray-500 line-clamp-1 uppercase font-bold tracking-wider">{extractDomain(link.url)}</p>
                          </div>
                        </div>
                      )
                    })}

                    {/* Quoted Spotify Previews */}
                    {qpUrls.map((url: string, idx: number) => {
                      const spotify = extractSpotifyId(url)
                      if (!spotify) return null
                      return (
                        <div key={`qp-spotify-${idx}`} className="rounded-xl overflow-hidden border border-gray-100 bg-white">
                          <iframe
                            src={`https://open.spotify.com/embed/${spotify.type}/${spotify.id}?utm_source=generator&theme=0`}
                            width="100%"
                            height={spotify.type === 'track' ? "80" : "152"}
                            frameBorder="0"
                            allowFullScreen
                            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
                            loading="lazy"
                            className="block"
                          />
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )
          })()}

          {/* Engagement Buttons */}
          <div className="flex items-center justify-start gap-x-8 sm:gap-x-12 mt-4 text-gray-500">
            {/* Comment Button */}
            <Link href={`/u/${post.profiles?.username}/${getSlug(post.id, post.content)}`} className="flex items-center gap-2 hover:text-sky-500 transition-colors group/comment">
              <div className="p-2 -m-2 group-hover/comment:bg-sky-50 rounded-full transition-colors">
                <MessageCircle className="w-5 h-5" />
              </div>
              <span className="text-[13px] font-medium">{post.comments_count}</span>
            </Link>

            {/* Repost Button */}
            <button onClick={handleRepost} className={`flex items-center gap-2 transition-colors group/repost ${isReposted ? 'text-emerald-500' : 'hover:text-emerald-500'}`}>
              <div className={`p-2 -m-2 group-hover/repost:bg-emerald-50 rounded-full transition-colors ${isReposted ? 'bg-emerald-50' : ''}`}>
                <Repeat className="w-5 h-5" />
              </div>
              <span className="text-[13px] font-medium">{repostCount}</span>
            </button>

            {/* Like Button */}
            <button onClick={handleLike} className={`flex items-center gap-2 transition-colors group/like ${isLiked ? 'text-rose-500' : 'hover:text-rose-500'}`}>
              <div className={`p-2 -m-2 group-hover/like:bg-rose-50 rounded-full transition-colors ${isLiked ? 'bg-rose-50' : ''}`}>
                <Heart className={`w-5 h-5 ${isLiked ? 'fill-current' : ''}`} />
              </div>
              <span className="text-[13px] font-medium">{likesCount}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}