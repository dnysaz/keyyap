'use client'

import { useEffect, useRef } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { supabase } from '@/lib/supabase'

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { setUser, setProfile } = useAuthStore()
  const initialized = useRef(false)

  useEffect(() => {
    if (initialized.current) return
    initialized.current = true

    async function initAuth() {
      try {
        // Use getSession() for fast initial load (reads from localStorage cache)
        const { data: { session } } = await supabase.auth.getSession()
        
        if (session?.user) {
          setUser({ id: session.user.id, email: session.user.email! })
          
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single()

          if (profile) {
            setProfile(profile)
          }
        } else {
          setUser(null)
          setProfile(null)
        }
      } catch (err) {
        console.error('Auth init error:', err)
        setUser(null)
        setProfile(null)
      } finally {
        // Always mark loading as false, even for guests
        useAuthStore.setState({ loading: false })
      }
    }

    initAuth()

    // Listen for all auth changes (login, logout, token refresh, etc.)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'INITIAL_SESSION') return // Already handled above

      if (event === 'TOKEN_REFRESHED') {
        // Token was silently refreshed — keep user state alive
        if (session?.user) {
          setUser({ id: session.user.id, email: session.user.email! })
        }
        return
      }

      if (event === 'SIGNED_OUT') {
        setUser(null)
        setProfile(null)
        useAuthStore.setState({ loading: false })
        return
      }

      if (session?.user) {
        setUser({ id: session.user.id, email: session.user.email! })

        let { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single()

        if (!profile) {
          const username = session.user.user_metadata?.username || 
            session.user.email?.split('@')[0] || 
            `user_${session.user.id.slice(0, 8)}`
          const fullName = session.user.user_metadata?.full_name || 
            session.user.email?.split('@')[0] || 'User'

          const { data: newProfile, error } = await supabase
            .from('profiles')
            .insert({
              id: session.user.id,
              username: username.toLowerCase().replace(/\s/g, '_'),
              full_name: fullName,
            })
            .select()
            .single()

          if (!error && newProfile) {
            profile = newProfile
          }
        }

        setProfile(profile)
      } else {
        setUser(null)
        setProfile(null)
      }

      useAuthStore.setState({ loading: false })
    })

    return () => subscription.unsubscribe()
  }, [setUser, setProfile])

  return <>{children}</>
}