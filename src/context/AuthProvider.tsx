'use client'

import { useEffect, useRef } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { supabase } from '@/lib/supabase'

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { setUser, setProfile } = useAuthStore()
  const initialized = useRef(false)

  useEffect(() => {
    // Listen for all auth changes (initial mount, login, logout, token refresh, etc.)
    // Supabase will fire INITIAL_SESSION immediately upon subscribing.
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
            const { data: profile } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', session.user.id)
              .single()

            if (profile) {
              setProfile(profile)
            }
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

    // Safety fallback: if no event fires in 5 seconds, stop loading
    const timer = setTimeout(() => {
      if (useAuthStore.getState().loading) {
        console.warn('⚠️ Auth init timeout - forcing loading state to false')
        useAuthStore.setState({ loading: false })
      }
    }, 5000)

    return () => {
      subscription.unsubscribe()
      clearTimeout(timer)
    }
  }, [setUser, setProfile])

  return <>{children}</>
}