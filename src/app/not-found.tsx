'use client'

import Link from 'next/link'
import Sidebar from '@/components/Sidebar'
import RightSidebar from '@/components/RightSidebar'

export default function NotFound() {
  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="flex justify-center mb-8">
           <Link href="/" className="no-underline group">
            <span className="text-4xl font-black tracking-tighter">
              <span className="text-gray-900">Key</span>
              <span className="text-primary" style={{ fontFamily: 'Pacifico, cursive' }}>Yap!</span>
            </span>
          </Link>
        </div>
        
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-gray-900">Hmm...this page doesn’t exist.</h1>
          <p className="text-gray-500">Try searching for something else, or head back to the home feed.</p>
        </div>

        <div className="flex flex-col gap-3 pt-4">
          <Link 
            href="/search" 
            className="w-full bg-primary text-white py-3 rounded-full font-bold hover:bg-primary-hover transition-colors shadow-sm"
          >
            Search KeyYap
          </Link>
          <Link 
            href="/" 
            className="w-full bg-white text-gray-900 border border-gray-200 py-3 rounded-full font-bold hover:bg-gray-50 transition-colors"
          >
            Go back home
          </Link>
        </div>
        
        <p className="text-xs text-gray-400 mt-12">
          Error 404: Not Found
        </p>
      </div>
    </div>
  )
}
