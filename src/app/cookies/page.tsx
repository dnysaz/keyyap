'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import Sidebar from '@/components/Sidebar'
import RightSidebar from '@/components/RightSidebar'
import Navigation from '@/components/Navigation'

export default function CookiesPage() {
  const [cookieData, setCookieData] = useState<{ value: string; updated_at: string } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchCookies() {
      const { data } = await supabase
        .from('site_settings')
        .select('value, updated_at')
        .eq('key', 'cookie_policy')
        .single()
      
      if (data) {
        setCookieData(data)
      }
      setLoading(false)
    }
    fetchCookies()
  }, [])

  const formattedDate = cookieData?.updated_at 
    ? new Date(cookieData.updated_at).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    : 'Recently'

  return (
    <div className="min-h-screen bg-white">
      <Sidebar />
      <div className="lg:ml-[72px] xl:ml-[260px] flex justify-center">
        <div className="flex w-full max-w-[1050px] min-w-0 items-start">
          <main className="flex-1 max-w-2xl w-full border-x border-gray-100 min-h-screen min-w-0 bg-white">
            {/* Page Header */}
            <div className="border-b border-gray-100 bg-white/90 backdrop-blur-md sticky top-0 z-30">
              <div className="px-4 py-3 flex items-center gap-4">
                <Link href="/" className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                  <ArrowLeft className="w-5 h-5 text-gray-900" />
                </Link>
                <div className="min-w-0">
                  <h1 className="text-xl font-bold truncate">Cookie Policy</h1>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-0.5">
                    Updated: {formattedDate}
                  </p>
                </div>
              </div>
            </div>

            {/* Content Area */}
            <div className="p-6 md:p-8 pb-24">
              {loading ? (
                <div className="flex items-center justify-center py-20">
                  <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                </div>
              ) : (
                <div className="legal-content-wrapper">
                  <div 
                    dangerouslySetInnerHTML={{ __html: cookieData?.value || 'Cookie policy will be updated soon.' }} 
                    className="rich-text-content"
                  />
                </div>
              )}
            </div>
          </main>
          <RightSidebar />
        </div>
      </div>
      <div className="lg:hidden">
        <Navigation />
      </div>
      <style jsx global>{`
        .legal-content-wrapper { font-size: 14px; line-height: 1.5; color: #374151; }
        .legal-content-wrapper > * { margin-top: 0 !important; margin-bottom: 0.4rem !important; }
        .legal-content-wrapper h1, .legal-content-wrapper h2, .legal-content-wrapper h3 { 
          font-weight: 700; color: #111; text-transform: uppercase; letter-spacing: 0.05em; 
          margin-top: 1.5rem !important; margin-bottom: 0.5rem !important; display: block;
        }
        .legal-content-wrapper h1 { font-size: 1.25rem; }
        .legal-content-wrapper h2 { font-size: 1rem; }
        .legal-content-wrapper p:empty { display: none !important; }
        .legal-content-wrapper ul, .legal-content-wrapper ol { margin-left: 1.5rem; margin-bottom: 1rem !important; }
        .legal-content-wrapper li { margin-bottom: 0.2rem !important; }
        .legal-content-wrapper a { color: #f36c1e; text-decoration: underline; }
      `}</style>
    </div>
  )
}
