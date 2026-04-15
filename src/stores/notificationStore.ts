import { create } from 'zustand'
import { supabase } from '@/lib/supabase'

interface NotificationState {
  unreadCount: number
  setUnreadCount: (count: number) => void
  fetchUnreadCount: (userId: string) => Promise<void>
  incrementUnreadCount: () => void
  resetUnreadCount: () => void
}

export const useNotificationStore = create<NotificationState>((set) => ({
  unreadCount: 0,
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
  incrementUnreadCount: () => set((state) => ({ unreadCount: state.unreadCount + 1 })),
  resetUnreadCount: () => set({ unreadCount: 0 }),
}))
