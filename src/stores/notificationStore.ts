import { create } from 'zustand'
import { supabase } from '@/lib/supabase'

interface Notification {
  id: string
  type: string
  created_at: string
  is_read: boolean
  from_user_id: string
  post_id?: string
  from_profile?: {
    username: string
    full_name: string
    avatar_url: string
  }
  post?: {
    id: string
    content: string
  }
  comment?: {
    content: string
  }
}

interface NotificationState {
  unreadCount: number
  notifications: Notification[]
  loading: boolean
  hasFetched: boolean
  setUnreadCount: (count: number) => void
  fetchNotifications: (userId: string) => Promise<void>
  fetchUnreadCount: (userId: string) => Promise<void>
  incrementUnreadCount: () => void
  resetUnreadCount: () => void
  addNotification: (notif: Notification) => void
  markAllAsRead: (userId: string) => Promise<void>
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  unreadCount: 0,
  notifications: [],
  loading: false,
  hasFetched: false,
  setUnreadCount: (count) => set({ unreadCount: count }),
  
  fetchUnreadCount: async (userId) => {
    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_read', false)
    
    if (!error) {
      set({ unreadCount: count || 0 })
    }
  },

  fetchNotifications: async (userId) => {
    // If we already have data, don't show full loading, fetch in background
    if (get().notifications.length === 0) set({ loading: true })
    
    const { data, error } = await supabase
      .from('notifications')
      .select(`
        *,
        from_profile:from_user_id (username, full_name, avatar_url),
        post:post_id (content, id, profiles:user_id (username)),
        comment:comment_id (content)
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(50)

    if (!error && data) {
      set({ 
        notifications: data as Notification[], 
        unreadCount: data.filter(n => !n.is_read).length,
        loading: false,
        hasFetched: true
      })
    } else {
      set({ loading: false })
    }
  },

  markAllAsRead: async (userId) => {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', userId)
      .eq('is_read', false)
    
    if (!error) {
      set((state) => ({
        unreadCount: 0,
        notifications: state.notifications.map(n => ({ ...n, is_read: true }))
      }))
    }
  },

  addNotification: (notif) => set((state) => ({
    notifications: [notif, ...state.notifications],
    unreadCount: state.unreadCount + 1
  })),

  incrementUnreadCount: () => set((state) => ({ unreadCount: state.unreadCount + 1 })),
  resetUnreadCount: () => set({ unreadCount: 0 }),
}))
