'use client'

import { useEffect, useRef } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import { useNotificationStore } from '@/stores/notificationStore'

export default function NotificationHandler() {
  const { user } = useAuthStore()
  const { fetchUnreadCount, incrementUnreadCount } = useNotificationStore()
  const channelRef = useRef<any>(null)

  useEffect(() => {
    if (!user?.id) {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
      return
    }

    const userId = user.id

    // Delay initialization slightly to let browser settle
    const timer = setTimeout(() => {
      // 1. Fetch initial count
      fetchUnreadCount(userId)

      // 2. Clean up before starting new
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
      }

      // 3. Define the channel
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
            console.log('✨ New notification received:', payload)
            incrementUnreadCount()
            // Optionally we could fetch notifications here too for the instant feel
          }
        )
        .subscribe((status) => {
          if (status === 'SUBSCRIBED') {
            console.log('✅ Realtime connected for user:', userId)
          }
          if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
            console.log('⚠️ Realtime connection closed/error:', status)
          }
        })

      channelRef.current = channel
    }, 1000)

    // Fallback polling (keep it long, e.g., 60s)
    const pollInterval = setInterval(() => {
      fetchUnreadCount(userId)
    }, 60000)

    return () => {
      clearTimeout(timer)
      clearInterval(pollInterval)
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
  }, [user?.id])

  return null
}
