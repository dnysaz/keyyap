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

    // 1. Immediately check session from cache (fast!)
    async function initAuth() {
      try {
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
        }
      } catch (err) {
        console.error('Auth init error:', err)
      } finally {
        // Always mark loading as false, even for guests
        useAuthStore.setState({ loading: false })
      }
    }

    initAuth()

    // 2. Listen for future auth changes (login/logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'INITIAL_SESSION') return // Already handled above

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