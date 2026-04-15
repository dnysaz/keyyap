import { create } from 'zustand'
import { supabase } from '@/lib/supabase'
import type { User, Profile } from '@/types'

interface AuthState {
  user: User | null
  profile: Profile | null
  loading: boolean
  setUser: (user: User | null) => void
  setProfile: (profile: Profile | null) => void
  loadProfile: () => Promise<void>
  fetchUser: () => Promise<void>
  signOut: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  profile: null,
  loading: true,
  setUser: (user) => set({ user }),
  setProfile: (profile) => set({ profile }),
  loadProfile: async () => {
    const currentUser = get().user
    if (!currentUser) return
    
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', currentUser.id)
      .single()
    if (profile) {
      set({ profile })
    }
  },
  fetchUser: async () => {
    try {
      // Use getSession() for fast reads from local cache
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
        set({ user: { id: session.user.id, email: session.user.email! } })
        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single()
        if (profile) {
          set({ profile })
        }
      } else {
        set({ user: null, profile: null })
      }
    } catch (err) {
      console.error('fetchUser error:', err)
      set({ user: null, profile: null })
    } finally {
      set({ loading: false })
    }
  },
  signOut: async () => {
    await supabase.auth.signOut()
    set({ user: null, profile: null })
  },
}))