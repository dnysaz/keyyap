'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Globe, Search, ChevronRight } from 'lucide-react'
import Sidebar from '@/components/Sidebar'
import RightSidebar from '@/components/RightSidebar'
import Navigation from '@/components/Navigation'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'

export default function FeedSettingsPage() {
  const router = useRouter()
  const { user, profile, loadProfile } = useAuthStore()
  const [hideFromGlobal, setHideFromGlobal] = useState(false)
  const [hideFromSearch, setHideFromSearch] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    if (profile) {
      setHideFromGlobal((profile as any).hide_from_global || false)
      setHideFromSearch((profile as any).hide_from_search || false)
    }
  }, [profile])

  async function toggleSetting(field: string, currentValue: boolean) {
    if (!user) return
    
    const newValue = !currentValue
    if (field === 'hide_from_global') setHideFromGlobal(newValue)
    if (field === 'hide_from_search') setHideFromSearch(newValue)
    
    setSaving(true)
    const { error } = await supabase
      .from('profiles')
      .update({ [field]: newValue })
      .eq('id', user.id)

    if (error) {
      console.error('Update error:', error)
      // Revert UI on error
      if (field === 'hide_from_global') setHideFromGlobal(currentValue)
      if (field === 'hide_from_search') setHideFromSearch(currentValue)
    } else {
      await loadProfile()
    }
    setSaving(false)
  }

  return (
    <div className="min-h-screen bg-white">
      <Sidebar />
      <div className="lg:ml-[68px] xl:ml-[275px] flex justify-center">
        <div className="flex w-full max-w-[1050px]">
          <div className="flex-1 max-w-2xl border-r border-l border-gray-100 min-h-screen">
            <div className="sticky top-0 bg-white/80 backdrop-blur-sm border-b border-gray-100 px-4 py-3 flex items-center gap-4 z-10">
              <button 
                onClick={() => router.back()} 
                className="p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <ArrowLeft className="w-5 h-5 text-gray-600" />
              </button>
              <h1 className="font-bold text-lg">Feed Settings</h1>
            </div>

            <div className="p-4 space-y-6">
              <div className="space-y-4">
                <p className="text-sm text-gray-500 px-1 uppercase tracking-wider font-bold">Privacy & Visibility</p>
                
                {/* Hide from Global Switch */}
                <div className="flex items-center justify-between p-4 border border-gray-100 rounded-2xl bg-white shadow-sm">
                  <div className="flex items-center gap-4">
                    <div className="p-2.5 bg-orange-50 text-orange-600 rounded-xl">
                      <Globe className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-bold text-sm text-gray-900">Hide me from global</p>
                      <p className="text-xs text-gray-500">Only followers can see your posts on the Home feed.</p>
                    </div>
                  </div>
                  <button
                    disabled={saving}
                    onClick={() => toggleSetting('hide_from_global', hideFromGlobal)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                        hideFromGlobal ? 'bg-primary' : 'bg-gray-200'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        hideFromGlobal ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                {/* Hide from Search Switch */}
                <div className="flex items-center justify-between p-4 border border-gray-100 rounded-2xl bg-white shadow-sm">
                  <div className="flex items-center gap-4">
                    <div className="p-2.5 bg-orange-50 text-orange-600 rounded-xl">
                      <Search className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-bold text-sm text-gray-900">Hide me from search</p>
                      <p className="text-xs text-gray-500">Your profile and posts won't appear in search results.</p>
                    </div>
                  </div>
                  <button
                    disabled={saving}
                    onClick={() => toggleSetting('hide_from_search', hideFromSearch)}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${
                        hideFromSearch ? 'bg-primary' : 'bg-gray-200'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        hideFromSearch ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              </div>

              <div className="bg-orange-50 p-4 rounded-2xl">
                <p className="text-xs text-orange-800 leading-relaxed">
                  <strong>Note:</strong> Even if hidden from Global, your posts will still be visible to anyone visiting your profile directly if your account is public.
                </p>
              </div>
            </div>
          </div>
          <RightSidebar />
        </div>
      </div>
      <div className="lg:hidden">
        <Navigation />
      </div>
    </div>
  )
}
