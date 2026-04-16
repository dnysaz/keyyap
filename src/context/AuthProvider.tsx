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

    // Listen for all auth changes (initial mount, login, logout, token refresh, etc.)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log(`🔑 Auth event: ${event}`)

      if (event === 'SIGNED_OUT') {
        setUser(null)
        setProfile(null)
        useAuthStore.setState({ loading: false })
        return
      }

      if (event === 'TOKEN_REFRESHED' || event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
        if (session?.user) {
          const userObj = { id: session.user.id, email: session.user.email! }
          setUser(userObj)

          try {
            let { data: profile } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', session.user.id)
              .single()

            if (!profile && event === 'SIGNED_IN') {
              // Create profile only on actual sign in if missing
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

              if (!error && newProfile) profile = newProfile
            }

            if (profile) setProfile(profile)
          } catch (err) {
            console.error('Error fetching profile during auth change:', err)
          }
        } else {
          setUser(null)
          setProfile(null)
        }
      }

      // Mark loading as false once initial session or first meaningful event is processed
      useAuthStore.setState({ loading: false })
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [setUser, setProfile])

  return <>{children}</>
}