'use client'

import { useEffect } from 'react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'
import { useNotificationStore } from '@/stores/notificationStore'

export default function NotificationHandler() {
  const { user } = useAuthStore()
  const { fetchUnreadCount, incrementUnreadCount } = useNotificationStore()

  useEffect(() => {
    if (!user) return

    // Fetch initial count
    fetchUnreadCount(user.id)

    // Subscribe to real-time notifications
    const channel = supabase
      .channel(`realtime:notifications:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          console.log('New notification received:', payload)
          incrementUnreadCount()
          
          // Optional: Show a browser notification or toast here
          if (Notification.permission === 'granted') {
             // new Notification('You have a new interaction on KeyYap!')
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user])

  return null
}
