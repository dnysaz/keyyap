'use client'

import { useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import { useNotificationStore } from '@/stores/notificationStore'

export default function NotificationHandler() {
  const { user } = useAuthStore()
  const { fetchUnreadCount, incrementUnreadCount } = useNotificationStore()
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)

  useEffect(() => {
    if (!user?.id) {
      // Cleanup if user logged out
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
      return
    }

    const userId = user.id

    // Fetch initial count
    fetchUnreadCount(userId)

    // Clean up any existing channel before creating a new one
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current)
      channelRef.current = null
    }

    // Subscribe to real-time notifications
    const channel = supabase
      .channel(`realtime-notifs-${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          console.log('New notification received:', payload)
          incrementUnreadCount()
        }
      )
      .subscribe((status) => {
        console.log(`Notification realtime status for ${userId}:`, status)
        if (status === 'CHANNEL_ERROR') {
          // Retry after a delay
          setTimeout(() => {
            fetchUnreadCount(userId)
          }, 3000)
        }
      })

    channelRef.current = channel

    // Also poll periodically as a fallback for realtime (every 30 seconds)
    const pollInterval = setInterval(() => {
      fetchUnreadCount(userId)
    }, 30000)

    return () => {
      clearInterval(pollInterval)
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
  }, [user?.id])

  return null
}
