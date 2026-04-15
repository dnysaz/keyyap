'use client'

import Link from 'next/link'

export default function Unauthorized() {
  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-4 text-center">
      <div className="max-w-md w-full space-y-6">
        <div className="flex justify-center mb-8">
           <Link href="/" className="no-underline group">
            <span className="text-4xl font-black tracking-tighter">
              <span className="text-gray-900">Key</span>
              <span className="text-primary" style={{ fontFamily: 'Pacifico, cursive' }}>Yap!</span>
            </span>
          </Link>
        </div>
        
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-gray-900">Wait, you can’t go in there.</h1>
          <p className="text-gray-500">This area is reserved for members. Please log in to continue your journey.</p>
        </div>

        <div className="flex flex-col gap-3 pt-4">
          <Link 
            href="/login" 
            className="w-full bg-primary text-white py-3 rounded-full font-bold hover:bg-primary-hover transition-colors shadow-sm"
          >
            Log in to KeyYap
          </Link>
          <Link 
            href="/signup" 
            className="w-full bg-white text-gray-900 border border-gray-200 py-3 rounded-full font-bold hover:bg-gray-50 transition-colors"
          >
            Sign up for free
          </Link>
        </div>
        
        <div className="pt-24 opacity-20 select-none">
          <span className="text-6xl font-black text-gray-200">401</span>
        </div>
      </div>
    </div>
  )
}
