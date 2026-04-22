'use client'

import { useState, useEffect, useRef } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Heart, MessageCircle, Repeat, Send, UserPlus, UserCheck, ExternalLink, Link as LinkIcon, Search, Home, LogOut, TrendingUp, Bell, Play, SendHorizontal, Pencil, Trash2 } from 'lucide-react'
import { usePathname } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import { usePostStore } from '@/stores/postStore'
import Sidebar from '@/components/Sidebar'

/**
 * Local Instagram Icon fallback
 */
const Instagram = ({ className }: { className?: string }) => (
  <svg 
    xmlns="http://www.w3.org/2003/svg" 
    width="24" 
    height="24" 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
  </svg>
)
import RightSidebar from '@/components/RightSidebar'
import { PostDetailSkeleton } from '@/components/Skeleton'
import Navigation from '@/components/Navigation'
import Avatar from '@/components/Avatar'
import { getSlug, formatDate } from '@/lib/utils'
import { escapeHtml } from '@/lib/sanitize'
import LinkPreviewCard from '@/components/LinkPreviewCard'

interface Comment {
  id: string
  user_id: string
  post_id: string
  parent_comment_id: string | null
  content: string
  created_at: string
  updated_at: string
  is_deleted: boolean
  deleted_at: string | null
  profiles: {
    username: string
    full_name: string
    avatar_url: string
  } | null
  replies?: Comment[]
}

interface LinkMetadata {
  url: string
  title?: string
  description?: string
  image?: string
  domain?: string
  tiktok_id?: string | null
}

function extractSpotifyId(url: string) {
  const match = url.match(/https?:\/\/open\.spotify\.com\/(track|album|playlist)\/([a-zA-Z0-9]+)/)
  if (!match) return null
  return { type: match[1], id: match[2] }
}

function extractTiktokId(url: string): string | null {
  const match = url.match(/tiktok\.com\/.*\/video\/(\d+)/)
  return match ? match[1] : null
}

function extractInstagramId(url: string): string | null {
  const match = url.match(/instagram\.com\/(?:p|reels|reel)\/([A-Za-z0-9_-]+)/)
  return match ? match[1] : null
}

function formatContent(content: string) {
  if (!content) return null
  // SECURITY: Escape HTML entities first to prevent XSS injection
  let formatted = escapeHtml(content)
      // Detect URLs and Mentions and wrap in <a> tags
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

function extractYoutubeId(url: string): string | null {
  const match = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\s]+)/)
  return match ? match[1] : null
}

function extractDomain(url: string): string {
  try {
    const domain = new URL(url).hostname.replace('www.', '')
    return domain
  } catch {
    return url
  }
}

function truncateUrl(url: string, maxLength: number = 40): string {
  if (url.length <= maxLength) return url
  return url.slice(0, maxLength) + '...'
}

export default function PostDetailPage() {
  const params = useParams()
  const router = useRouter()
  const username = params.username as string
  const slug = params.slug as string
  const { user, profile: currentProfile, _hasHydrated: authHydrated } = useAuthStore()
  const { posts, _hasHydrated: postsHydrated } = usePostStore()

  const [post, setPost] = useState<any>(null)
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [comments, setComments] = useState<Comment[]>([])
  const [newComment, setNewComment] = useState('')
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null)
  const [editCommentContent, setEditCommentContent] = useState('')
  const [replyingTo, setReplyingTo] = useState<Comment | null>(null)
  const [expandedVideo, setExpandedVideo] = useState<string | null>(null)
  const [isLiked, setIsLiked] = useState(false)
  const [likesCount, setLikesCount] = useState(0)
  const [isFollowing, setIsFollowing] = useState(false)
  const [isReposted, setIsReposted] = useState(false)
  const [repostCount, setRepostCount] = useState(0)
  const [commentCount, setCommentCount] = useState(0)
  const [showFull, setShowFull] = useState(false)
  const [isLoadingLike, setIsLoadingLike] = useState(false)
  const [isLoadingRepost, setIsLoadingRepost] = useState(false)
  const commentInputRef = useRef<HTMLTextAreaElement>(null)

  // Auth is handled by AuthProvider — no need to call fetchUser() here

  // Load comment draft from localStorage
  useEffect(() => {
    if (post?.id) {
      const saved = localStorage.getItem(`draft-comment-${post.id}`)
      if (saved) setNewComment(saved)
    }
  }, [post?.id])

  // Save comment draft to localStorage
  useEffect(() => {
    if (post?.id) {
      if (newComment) localStorage.setItem(`draft-comment-${post.id}`, newComment)
      else localStorage.removeItem(`draft-comment-${post.id}`)
    }
  }, [newComment, post?.id])

  useEffect(() => {
    let isMounted = true

    async function fetchPost() {
      const parts = slug.split('-')
      const idPrefix = parts[parts.length - 1]

      try {
        // Strategy 0: Check global postStore (CACHE)
        const cachedPost = posts.find(p => {
          const expectedSlug = getSlug(p.id, p.content)
          return expectedSlug === slug || p.id.startsWith(idPrefix)
        })

        if (cachedPost) {
          setProfile(cachedPost.profiles)
          setPost(cachedPost)
          setLikesCount(cachedPost.likes_count ?? 0)
          setRepostCount(cachedPost.shares_count ?? 0)
          setCommentCount(cachedPost.comments_count ?? 0)
          setIsLiked(cachedPost.is_liked || false)
          setLoading(false)
          // Continue background fetch to ensure fresh data (comments, latest counts)
        }

        // Strategy 1: Try direct ID prefix match (fastest)
        let matchedPost: any = null
        
        if (idPrefix && idPrefix.length >= 6) {
          try {
            const { data: directMatch } = await supabase
              .from('posts')
              .select('*, profiles(*)')
              .eq('is_deleted', false)
              .filter('id::text', 'ilike', `${idPrefix}%`)
              .limit(5)

            if (directMatch && directMatch.length > 0) {
              matchedPost = directMatch.find((p: any) => 
                p.profiles?.username?.toLowerCase() === username.toLowerCase()
              ) || directMatch[0]
            }
          } catch {
            // Strategy 1 failed (UUID filter not supported), fall through to Strategy 2
          }
        }

        // Strategy 2: Fallback to username-based search
        if (!matchedPost) {
          const { data: posts, error: postError } = await supabase
            .from('posts')
            .select('*, profiles!inner(*)')
            .eq('is_deleted', false)
            .ilike('profiles.username', username)
            .order('created_at', { ascending: false })
            .limit(50)

          if (postError) throw postError

          matchedPost = posts?.find((p: any) => {
            const expectedSlug = getSlug(p.id, p.content)
            if (expectedSlug === slug) return true
            if (idPrefix && p.id.startsWith(idPrefix)) return true
            return false
          })
        }

        if (!isMounted) return

        if (!matchedPost) {
          if (isMounted) setLoading(false)
          return
        }

        // Fetch quoted post separately if needed
        if ((matchedPost as any).quoted_post_id) {
          const { data: qpData } = await supabase
            .from('posts')
            .select('*, profiles:user_id (id, username, full_name, avatar_url)')
            .eq('id', (matchedPost as any).quoted_post_id)
            .single()
            ; (matchedPost as any).quoted_post = qpData || null
        }

        if (!isMounted) return

        const profileData = matchedPost.profiles
        setProfile(profileData)
        setPost(matchedPost)
        setLikesCount(matchedPost.likes_count ?? 0)
        setRepostCount(matchedPost.shares_count ?? 0)
        setCommentCount(matchedPost.comments_count ?? 0)

        // Check like/repost/follow status — use current user ID from store
        const currentUserId = useAuthStore.getState().user?.id
        if (currentUserId) {
          const [likeStatus, repostStatus, followStatus] = await Promise.all([
            supabase.from('post_likes').select('*').eq('user_id', currentUserId).eq('post_id', matchedPost.id).maybeSingle(),
            supabase.from('reposts').select('*').eq('user_id', currentUserId).eq('original_post_id', matchedPost.id).maybeSingle(),
            supabase.from('follows').select('*').eq('follower_id', currentUserId).eq('following_id', profileData.id).maybeSingle()
          ])
          if (isMounted) {
            setIsLiked(!!likeStatus.data)
            setIsReposted(!!repostStatus.data)
            setIsFollowing(!!followStatus.data)
          }
        }
      } catch (err) {
        console.error('Fetch post error:', err)
      } finally {
        if (isMounted) setLoading(false)
      }
    }

    if (username && slug && postsHydrated && authHydrated) {
      setLoading(post ? false : true) // Don't show loading if we already found it in Strategy 0
      fetchPost()
    }

    // Safety timeout: never stay loading forever
    const safetyTimer = setTimeout(() => {
      if (isMounted) setLoading(false)
    }, 8000)

    return () => { 
      isMounted = false 
      clearTimeout(safetyTimer)
    }
  }, [username, slug])

  // Fetch comments when post loads
  useEffect(() => {
    if (!post?.id) return
    fetchCommentsForPost(post.id)
  }, [post?.id])

  async function fetchCommentsForPost(postId: string) {
    const { data: commentsData } = await supabase
      .from('comments')
      .select('*, profiles(username, full_name, avatar_url)')
      .eq('post_id', postId)
      .order('created_at', { ascending: true })

    const formattedComments = (commentsData || []).map((c: any) => ({
      ...c,
      profiles: Array.isArray(c.profiles) ? c.profiles[0] : c.profiles
    }))

    const activeComments = formattedComments.filter(c => !c.is_deleted)

    setComments(buildCommentTree(formattedComments))
    setCommentCount(activeComments.length);

    // Sync comment count in database if it's out of sync
    if (post && activeComments.length !== (post.comments_count ?? 0)) {
      supabase
        .from('posts')
        .update({ comments_count: activeComments.length })
        .eq('id', postId)
        .then(() => {
          // Also update local post object
          setPost((p: any) => p ? { ...p, comments_count: activeComments.length } : p)
        })
    }

    fetchCommentsForPost(post.id)
  }

  // Real-time subscription for comments
  useEffect(() => {
    if (!post?.id) return

    const postId = post.id

    const channel = supabase
      .channel(`realtime-comments-${postId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'comments',
          filter: `post_id=eq.${postId}`
        },
        async (payload) => {


          if (payload.eventType === 'INSERT') {
            const newCommentId = payload.new.id
            // Only fetch if we don't already have it
            setComments((prevTree) => {
              // Deep check if we already have this comment (from optimistic UI or manual fetch)
              const hasComment = JSON.stringify(prevTree).includes(newCommentId)
              if (!hasComment) {
                // To be completely safe and avoid stale-closures, we schedule a full tree re-fetch.
                // We add a tiny delay to ensure Supabase read replicas are synced.
                setTimeout(() => fetchCommentsForPost(postId), 150)
              }
              return prevTree
            })
            // Update counter
            setCommentCount(prev => prev + 1)
            setPost((p: any) => p ? ({ ...p, comments_count: (p.comments_count || 0) + 1 }) : p)
          } else if (payload.eventType === 'DELETE') {
            setCommentCount(prev => Math.max(0, prev - 1))
            setPost((p: any) => p ? ({ ...p, comments_count: Math.max(0, (p.comments_count || 0) - 1) }) : p)
            setTimeout(() => fetchCommentsForPost(postId), 100)
          } else if (payload.eventType === 'UPDATE') {
            setTimeout(() => fetchCommentsForPost(postId), 100)
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [post?.id])


  function buildCommentTree(flatComments: Comment[]): Comment[] {
    const map: { [key: string]: Comment } = {}
    const roots: Comment[] = []
    flatComments.forEach(c => { map[c.id] = { ...c, replies: [] } })
    flatComments.forEach(c => {
      if (c.parent_comment_id && map[c.parent_comment_id]) {
        map[c.parent_comment_id].replies?.push(map[c.id])
      } else if (!c.parent_comment_id) {
        roots.push(map[c.id])
      }
    })
    return roots
  }

  function handleVideoClick(url: string) {
    const youtubeId = extractYoutubeId(url)
    if (youtubeId) {
      setExpandedVideo(expandedVideo === youtubeId ? null : youtubeId)
    }
  }

  async function handleSubmitComment(e?: any) {
    if (e?.preventDefault) e.preventDefault()
    if (!user || !newComment.trim() || !post) return

    // Immediately clear input to improve perceived performance
    const commentText = newComment.trim()
    setNewComment('')
    setReplyingTo(null)

    try {
      const { data: insertedComment, error } = await supabase.from('comments').insert({
        user_id: user.id,
        post_id: post.id,
        parent_comment_id: replyingTo?.id || null,
        content: commentText
      }).select().single()

      if (error) throw error

      // Clear draft on success
      if (post?.id) localStorage.removeItem(`draft-comment-${post.id}`)

      // Update local count and re-fetch to show new comment
      setPost((p: any) => ({ ...p, comments_count: (p?.comments_count || 0) + 1 }))
      await fetchCommentsForPost(post.id)
    } catch (err) {
      console.error('Error inserting comment:', err)
      // Restore text if failed so user doesn't lose it
      setNewComment(commentText)
    }
  }

  async function handleEditCommentSubmit(commentId: string) {
    const text = editCommentContent.trim()
    if (!text || !user || !post?.id) {
      setEditingCommentId(null)
      return
    }

    try {
      const { error } = await supabase
        .from('comments')
        .update({ content: text, updated_at: new Date().toISOString() })
        .eq('id', commentId)
        .eq('user_id', user.id)

      if (error) throw error
      setEditingCommentId(null)
      await fetchCommentsForPost(post.id)
    } catch (err) {
      console.error('Error editing comment:', err)
    }
  }

  async function handleDeleteCommentAction(commentId: string) {
    if (!user || !post?.id) return

    try {
      const { error } = await supabase
        .from('comments')
        .update({ is_deleted: true, deleted_at: new Date().toISOString() })
        .eq('id', commentId)
        .eq('user_id', user.id)

      if (error) throw error
      await fetchCommentsForPost(post.id)
      setPost((p: any) => ({ ...p, comments_count: Math.max(0, (p?.comments_count || 0) - 1) }))
    } catch (err) {
      console.error('Error deleting comment:', err)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmitComment(e)
    }
  }

  async function handleLike() {
    if (!user || !post || isLoadingLike) return
    setIsLoadingLike(true)
    try {
      if (isLiked) {
        await supabase.from('post_likes').delete().eq('user_id', user.id).eq('post_id', post.id)
        setIsLiked(false)
        setLikesCount(l => Math.max(0, l - 1))
      } else {
        await supabase.from('post_likes').insert({ user_id: user.id, post_id: post.id })
        setIsLiked(true)
        setLikesCount(l => l + 1)
      }
    } finally { setIsLoadingLike(false) }
  }

  async function handleFollow() {
    if (!user || !profile) return
    if (isFollowing) {
      await supabase.from('follows').delete().eq('follower_id', user.id).eq('following_id', profile.id)
      setIsFollowing(false)
    } else {
      await supabase.from('follows').insert({ follower_id: user.id, following_id: profile.id })
      setIsFollowing(true)
    }
  }

  async function handleRepost() {
    if (!user || !post || isLoadingRepost) return
    setIsLoadingRepost(true)
    try {
      if (isReposted) {
        await supabase.from('reposts').delete().eq('user_id', user.id).eq('original_post_id', post.id)
        setIsReposted(false)
        setRepostCount(r => Math.max(0, r - 1))
      } else {
        await supabase.from('reposts').insert({ user_id: user.id, original_post_id: post.id })
        setIsReposted(true)
        setRepostCount(r => r + 1)
      }
    } finally { setIsLoadingRepost(false) }
  }

  const [followedUsers, setFollowedUsers] = useState<any[]>([])
  const [mentionSearch, setMentionSearch] = useState('')
  const [showMentionSuggestions, setShowMentionSuggestions] = useState(false)
  const [highlightedIndex, setHighlightedIndex] = useState(0)

  useEffect(() => {
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
    fetchFollowing()
  }, [user])

  const filteredMentions = followedUsers.filter(u => 
    u.username.toLowerCase().includes(mentionSearch.toLowerCase()) || 
    (u.full_name && u.full_name.toLowerCase().includes(mentionSearch.toLowerCase()))
  )

  function insertMention(selectedUser: any) {
    const parts = newComment.split(' ')
    const lastPart = parts[parts.length - 1]
    if (lastPart.startsWith('@')) {
      parts[parts.length - 1] = `@${selectedUser.username} `
      setNewComment(parts.join(' '))
    }
    setShowMentionSuggestions(false)
    commentInputRef.current?.focus()
  }

  function handleInputChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const val = e.target.value
    setNewComment(val)
    
    // Auto resize
    e.target.style.height = 'auto'
    e.target.style.height = `${Math.min(150, Math.max(36, e.target.scrollHeight))}px`

    // Detect @ mention
    const words = val.split(/[\s\n]/)
    const lastWord = words[words.length - 1]
    
    // Minimal 2 characters after @ (e.g. @na) means total length >= 3
    if (lastWord.startsWith('@') && lastWord.length >= 3) {
      setMentionSearch(lastWord.substring(1))
      setShowMentionSuggestions(true)
      setHighlightedIndex(0)
    } else {
      setShowMentionSuggestions(false)
    }
  }

  function formatCommentLinkText(content: string) {
    // SECURITY: Escape HTML entities first to prevent XSS
    let formatted = escapeHtml(content)

    // 1. Handle Mentions - Always link for consistency
    formatted = formatted.replace(/@(\w+)/g, `<a href="/u/$1" class="text-primary font-bold hover:underline">@$1</a>`)

    // 2. Handle URLs
    formatted = formatted.replace(/(https?:\/\/[^\s]+)/g, (url) => {
      const truncated = url.length > 30 ? url.substring(0, 27) + '...' : url
      return `<a href="${url}" target="_blank" rel="noopener noreferrer" class="text-blue-500 hover:underline break-all inline font-medium">${truncated}</a>`
    })
    return formatted
  }

  function handleCommentKeyDown(e: React.KeyboardEvent) {
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
    } else {
      handleKeyDown(e)
    }
  }

  function renderComment(comment: Comment, depth: number = 0) {
    const isOwner = user?.id === comment.user_id
    const isEditing = editingCommentId === comment.id

    // Check if edited (tolerate 1 second difference for db processing speed)
    const isEdited = !comment.is_deleted && comment.updated_at && comment.created_at && 
                     Math.abs(new Date(comment.updated_at).getTime() - new Date(comment.created_at).getTime()) > 1000

    if (comment.is_deleted) {
      return (
        <div key={comment.id} className={depth > 0 ? 'ml-6 lg:ml-10 mt-1 border-l-2 border-primary/30 pl-4 py-2' : 'py-4 border-b border-gray-50 last:border-0'}>
          <div className="flex gap-2 lg:gap-3 items-center">
            <div className="w-8 h-8 rounded-full bg-gray-100 border border-gray-200 flex items-center justify-center shrink-0">
               <Trash2 className="w-3.5 h-3.5 text-gray-400" />
            </div>
            <div className="flex-1 min-w-0">
               <span className="text-[13px] italic text-gray-500 bg-gray-50 px-3 py-1.5 rounded border border-gray-100 inline-block">
                 This comment has been deleted at {formatDate(comment.deleted_at || comment.updated_at)}
               </span>
            </div>
          </div>
          {comment.replies && comment.replies.length > 0 && depth < 2 && (
            <div className="mt-1">
              {comment.replies.map(reply => renderComment(reply, depth + 1))}
            </div>
          )}
        </div>
      )
    }

    return (
      <div key={comment.id} className={depth > 0 ? 'ml-6 lg:ml-10 mt-1 border-l-2 border-primary/30 pl-4 py-2' : 'py-4 border-b border-gray-50 last:border-0 group/comment'}>
        <div className="flex gap-2 lg:gap-3">
          <Link href={`/u/${comment.profiles?.username}`}>
            <Avatar url={comment.profiles?.avatar_url || undefined} username={comment.profiles?.username} size="sm" />
          </Link>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Link href={`/u/${comment.profiles?.username}`} className="font-bold text-gray-900 hover:underline text-[13px] lg:text-[14px]">
                  {comment.profiles?.full_name || comment.profiles?.username}
                </Link>
                <span className="text-gray-400 text-[10px] lg:text-xs">{formatDate(comment.created_at)}</span>
              </div>
              
              {/* Action Menu overlay - only show if owner and not editing */}
              {isOwner && !isEditing && (
                <div className="opacity-0 group-hover/comment:opacity-100 transition-opacity flex items-center gap-1">
                   <button 
                     onClick={() => {
                        setEditingCommentId(comment.id)
                        setEditCommentContent(comment.content)
                     }}
                     className="p-1.5 text-gray-400 hover:text-blue-500 hover:bg-blue-50 rounded-full transition-colors"
                     title="Edit comment"
                   >
                     <Pencil className="w-3.5 h-3.5" />
                   </button>
                   <button 
                     onClick={() => handleDeleteCommentAction(comment.id)}
                     className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                     title="Delete comment"
                   >
                     <Trash2 className="w-3.5 h-3.5" />
                   </button>
                </div>
              )}
            </div>

            {isEditing ? (
              <div className="mt-2">
                <textarea
                  autoFocus
                  value={editCommentContent}
                  onChange={(e) => setEditCommentContent(e.target.value)}
                  className="w-full bg-gray-50 rounded-xl px-3 py-2 text-[13px] border border-gray-200 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary min-h-[60px] resize-none"
                />
                <div className="flex justify-end gap-2 mt-2">
                  <button 
                    onClick={() => setEditingCommentId(null)}
                    className="text-gray-500 text-[11px] font-bold px-3 py-1.5 hover:bg-gray-100 rounded-full transition-colors"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={() => handleEditCommentSubmit(comment.id)}
                    disabled={!editCommentContent.trim() || editCommentContent.trim() === comment.content}
                    className="bg-primary text-white text-[11px] font-bold px-4 py-1.5 rounded-full hover:bg-primary-hover disabled:opacity-50 transition-colors"
                  >
                    Save
                  </button>
                </div>
              </div>
            ) : (
              <div className="text-[13px] lg:text-[14px] mt-1 text-gray-800 leading-normal break-words pr-2">
                <span dangerouslySetInnerHTML={{ __html: formatCommentLinkText(comment.content) }} />
                
                {isEdited && (
                  <span className="text-[10px] text-gray-400 italic ml-2 bg-gray-50 px-1.5 py-0.5 rounded">Edited</span>
                )}

                {/* Link & Video Previews in Comments - Unified Component */}
                {(() => {
                  const urls = comment.content.match(/(https?:\/\/[^\s]+)/g) || []
                  if (urls.length === 0) return null
                  const uniqueUrls = Array.from(new Set(urls)) as string[]
                  return (
                    <div className="mt-3 space-y-3">
                      {uniqueUrls.map((url: string, idx: number) => (
                        <LinkPreviewCard key={`comment-link-${idx}`} url={url} />
                      ))}
                    </div>
                  )
                })()}
              </div>
            )}
            
            {depth < 2 && user && !isEditing && (
              <button
                onClick={() => {
                  setReplyingTo(comment)
                  setTimeout(() => commentInputRef.current?.focus(), 0)
                }}
                className="text-gray-400 text-[11px] lg:text-xs mt-2 hover:text-primary font-bold transition-colors"
              >
                Reply
              </button>
            )}
          </div>
        </div>
        {comment.replies && comment.replies.length > 0 && depth < 2 && (
          <div className="mt-1">
            {comment.replies.map(reply => renderComment(reply, depth + 1))}
          </div>
        )}
      </div>
    )
  }

  if (loading) return <PostDetailSkeleton />
  if (!post || !profile) return <div className="min-h-screen bg-white flex items-center justify-center text-gray-400 font-medium">Post missing or deleted</div>

  return (
    <div className="min-h-screen bg-white">
      <Sidebar />
      <div className="lg:ml-[72px] xl:ml-[260px] flex justify-center">
        <div className="flex w-full max-w-[1050px] items-start">
          <main className="flex-1 max-w-2xl border-x border-gray-100 min-h-screen bg-white pb-32 min-w-0 w-full relative">
            <div className="sticky top-0 bg-white/90 backdrop-blur-md z-30 px-4 py-3 border-b border-gray-50 flex items-center gap-6">
              <button onClick={() => router.back()} className="p-2 hover:bg-gray-100 rounded-full transition-colors flex shrink-0">
                <ArrowLeft className="w-5 h-5" />
              </button>
              <h2 className="font-bold text-lg">Yap!</h2>
            </div>

            <div className="px-4 py-4">
              <div className="flex gap-4">
                <Link href={`/u/${post.profiles?.username}`}>
                  <Avatar url={post.profiles?.avatar_url || undefined} username={post.profiles?.username} size="md" />
                </Link>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <div>
                      <Link href={`/u/${post.profiles?.username}`} className="font-bold text-gray-900 hover:underline block leading-tight">
                        {post.profiles?.full_name || post.profiles?.username}
                      </Link>
                      <span className="text-gray-500 text-sm">@{post.profiles?.username}</span>
                    </div>
                    {user && user.id !== profile?.id && (
                      <button onClick={handleFollow} className={`px-4 py-1.5 rounded-full text-sm font-bold border transition-all ${isFollowing ? 'text-gray-500 border-gray-200' : 'bg-gray-900 text-white border-transparent'}`}>
                        {isFollowing ? 'Following' : 'Follow'}
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-4 text-[14px] lg:text-[15px] text-gray-900 leading-relaxed whitespace-pre-wrap break-words">
                {formatContent(post.content)}
              </div>

              {/* Link Previews */}
              {(() => {
                const urls = post.content.match(/(https?:\/\/[^\s]+)/g) || []
                if (urls.length === 0) return null
                return (
                  <div className="mt-4 space-y-4">
                    {Array.from(new Set(urls)).map((url: any, idx: number) => (
                      <LinkPreviewCard key={idx} url={url as string} />
                    ))}
                  </div>
                )
              })()}

              {/* Quoted Post Box */}
              {(() => {
                const qpRaw = (post as any).quoted_post
                const qp = Array.isArray(qpRaw) ? qpRaw[0] : qpRaw
                if (!qp || !qp.id) return null

                const qpProfileRaw = qp.profiles || (qp as any).profiles_user_id
                const qpProfile = Array.isArray(qpProfileRaw) ? qpProfileRaw[0] : qpProfileRaw

                return (
                  <div className="mt-4 block border border-gray-200 rounded-2xl overflow-hidden hover:bg-gray-50/20 transition-all bg-white relative">
                    <Link
                      href={`/u/${qpProfile?.username || 'user'}/${getSlug(qp.id, qp.content || '')}`}
                      className="absolute inset-0 z-0"
                    />
                    <div className="p-3 px-4 relative z-10">
                      <div className="flex items-center gap-2 mb-1">
                        <Link href={`/u/${qpProfile?.username}`}>
                          <Avatar url={qpProfile?.avatar_url || undefined} username={qpProfile?.username} size="xs" />
                        </Link>
                        <Link href={`/u/${qpProfile?.username}`} className="font-bold text-[14px] text-gray-900 hover:underline">
                          {qpProfile?.full_name || qpProfile?.username || 'Unknown User'}
                        </Link>
                        <span className="text-gray-500 text-[14px]">@{qpProfile?.username || 'unknown'}</span>
                        <span className="text-gray-400 text-[14px]">· {formatDate(qp.created_at)}</span>
                      </div>
                      <div className="text-[15px] text-gray-700 whitespace-pre-wrap leading-normal mb-1 break-words">
                        {qp.content?.split(/(https?:\/\/[^\s]+)/g).map((part: string, i: number) => {
                          if (part.match(/^https?:\/\//)) {
                            const display = part.length > 40 ? part.substring(0, 40) + '...' : part
                            return <a key={i} href={part} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-medium">{display}</a>
                          }
                          return part
                        })}
                      </div>
                      {qp.hashtags && Array.isArray(qp.hashtags) && qp.hashtags.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mb-1">
                          {qp.hashtags.map((tag: string) => (
                            <Link key={tag} href={`/search?tag=${encodeURIComponent(tag)}`} className="text-primary text-[12px] hover:underline">
                              #{tag}
                            </Link>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Quoted Media Content */}
                    {(() => {
                      const urls = qp.content?.match(/(https?:\/\/[^\s]+)/g) || []
                      if (urls.length === 0) return null
                      return (
                        <div className="px-4 pb-4 space-y-3 relative z-10">
                          {Array.from(new Set(urls)).map((url: any, idx: number) => (
                            <LinkPreviewCard key={`qp-link-${idx}`} url={url as string} />
                          ))}
                        </div>
                      )
                    })()}
                  </div>
                )
              })()}

              <div className="mt-4 py-3 flex items-center gap-6 text-gray-500 text-sm">
                <button
                  onClick={handleLike}
                  className={`flex items-center gap-2 transition-all ${isLiked ? 'text-rose-500' : 'hover:text-rose-500'}`}
                >
                  <Heart className={`w-5 h-5 ${isLiked ? 'fill-current' : ''}`} />
                  <span className="font-bold">{likesCount}</span>
                </button>

                <button
                  onClick={() => commentInputRef.current?.focus()}
                  className="flex items-center gap-2 hover:text-sky-500 transition-all"
                >
                  <MessageCircle className="w-5 h-5" />
                  <span className="font-bold">{commentCount}</span>
                </button>

                <button
                  onClick={handleRepost}
                  className={`flex items-center gap-2 transition-all ${isReposted ? 'text-emerald-500' : 'hover:text-emerald-500'}`}
                >
                  <Repeat className={`w-5 h-5 ${isReposted ? 'fill-current' : ''}`} />
                  <span className="font-bold">{repostCount}</span>
                </button>

                <div className="ml-auto text-gray-300 font-medium">
                  {formatDate(post.created_at)}
                </div>
              </div>

              <div className="border-b border-gray-50" />


              <div className="mt-6 mb-20 divide-y divide-gray-50">
                {comments.length > 0 ? comments.map(c => renderComment(c)) : <div className="py-10 text-center text-gray-400">No replies yet. Be the first!</div>}
              </div>
            </div>

            {/* Truly Fixed Bottom Comment Input with Perfect Alignment */}
            <div className="fixed bottom-0 left-0 right-0 z-40 pointer-events-none">
              <div className="lg:ml-[72px] xl:ml-[260px] flex justify-center">
                <div className="flex w-full max-w-[1050px] items-start pointer-events-none">

                  {/* Input Container - Perfectly Matches Main Column */}
                  <div className="flex-1 max-w-2xl bg-white/95 backdrop-blur-md border-t border-x border-gray-100 mb-[64px] lg:mb-0 shadow-[0_-8px_30px_rgba(0,0,0,0.04)] pointer-events-auto relative">
                    
                    {user ? (
                      <>
                        {/* Minimalist Mention Suggestions UI */}
                        {showMentionSuggestions && filteredMentions.length > 0 && (
                          <div className="absolute bottom-full left-0 right-0 w-full px-2 pb-1 pointer-events-auto z-50">
                            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden animate-in fade-in slide-in-from-bottom-1 duration-200">
                              <div className="max-h-[220px] overflow-y-auto py-1">
                                {filteredMentions.map((suggestion, idx) => (
                                  <button
                                    key={suggestion.id}
                                    onClick={() => insertMention(suggestion)}
                                    onMouseEnter={() => setHighlightedIndex(idx)}
                                    className={`w-full flex items-center gap-3 p-2.5 px-4 transition-colors ${idx === highlightedIndex ? 'bg-gray-50' : 'hover:bg-gray-50/50'}`}
                                  >
                                    <Avatar url={suggestion.avatar_url} username={suggestion.username} size="xs" />
                                    <div className="text-left flex-1 min-w-0">
                                      <div className="font-bold text-[13px] text-gray-900 truncate tracking-tight">{suggestion.full_name || suggestion.username}</div>
                                      <div className="text-[11px] text-gray-400 truncate mt-0.5">@{suggestion.username}</div>
                                    </div>
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>
                        )}

                        <div className="p-3 flex items-end gap-3 w-full">
                          <div className="shrink-0 mb-1">
                            <Avatar url={currentProfile?.avatar_url || undefined} username={currentProfile?.username || 'me'} size="sm" />
                          </div>
                          <div className="flex-1 min-w-0 flex flex-col">
                            {replyingTo && (
                              <div className="flex items-center gap-2 text-xs text-gray-400 mb-1.5 ml-1">
                                <span>Replying to @{replyingTo.profiles?.username}</span>
                                <button onClick={() => setReplyingTo(null)} className="font-bold text-primary hover:underline">Cancel</button>
                              </div>
                            )}
                            <div className="bg-gray-50 rounded-[24px] border border-gray-100 p-1.5 flex items-end focus-within:bg-white focus-within:border-primary/30 focus-within:ring-4 focus-within:ring-primary/5 transition-all">
                              <textarea
                                ref={commentInputRef}
                                value={newComment}
                                onChange={handleInputChange}
                                onKeyDown={handleCommentKeyDown}
                                placeholder="Post your reply"
                                className="flex-1 border-0 focus:ring-0 outline-none ring-0 resize-none text-[15px] bg-transparent placeholder:text-gray-400 py-2 px-3 min-h-[36px] max-h-[150px] overflow-y-auto custom-scrollbar"
                                rows={1}
                              />
                              <button
                                onClick={handleSubmitComment}
                                disabled={!newComment.trim()}
                                className="bg-primary text-white h-9 w-9 flex items-center justify-center rounded-full disabled:opacity-50 hover:bg-primary/90 transition-colors shrink-0 mb-0.5 mr-0.5 shadow-sm"
                                title="Reply"
                              >
                                <SendHorizontal className="w-4.5 h-4.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="p-4 py-5 flex items-center justify-between w-full bg-white">
                        <div className="flex flex-col">
                          <span className="text-[15px] text-gray-900 font-bold">Don't miss what's happening</span>
                          <span className="text-[13px] text-gray-500">Log in or sign up to join the conversation.</span>
                        </div>
                        <Link href="/login" className="px-5 py-2.5 rounded-full bg-primary text-white text-[14px] font-bold hover:bg-primary-hover transition-colors shadow-sm ml-4 shrink-0">
                          Log in
                        </Link>
                      </div>
                    )}
                  </div>

                  {/* Right Sidebar Spacer to keep main centered correctly */}
                  <div className="hidden lg:block w-[350px] shrink-0" />
                </div>
              </div>
            </div>
          </main>
          <RightSidebar />
        </div>
      </div>
      <div className="lg:hidden"><Navigation /></div>
    </div>
  )
}