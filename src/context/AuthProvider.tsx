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
          
          // Smooth cleanup: Clear hash from URL after successful sign in
          if (event === 'SIGNED_IN' && typeof window !== 'undefined' && window.location.hash) {
            window.history.replaceState(null, '', window.location.pathname + window.location.search);
          }

          // CRITICAL: Set loading false now, don't wait for profile.
          // This allows the Feed and other components to start their work immediately.
          useAuthStore.setState({ loading: false });

          // Fetch profile in parallel/background
          (async () => {
            try {
              const { data: profile } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', session.user.id)
                .single()
              
              if (profile) setProfile(profile)
            } catch (err) {
              console.error('BG Profile Fetch Error:', err)
            }
          })()
        } else {
          setUser(null)
          setProfile(null)
          useAuthStore.setState({ loading: false })
        }
      } else {
        // Handle other possible events
        useAuthStore.setState({ loading: false })
      }
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