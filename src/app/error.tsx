'use client'

import { useEffect } from 'react'
import Link from 'next/link'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log the error to an error reporting service
    console.error(error)
  }, [error])

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
          <h1 className="text-3xl font-bold text-gray-900">Something went wrong.</h1>
          <p className="text-gray-500">Don’t fret — it’s not your fault. Try refreshing the page or come back later.</p>
        </div>

        <div className="flex flex-col gap-3 pt-4">
          <button
            onClick={() => reset()}
            className="w-full bg-primary text-white py-3 rounded-full font-bold hover:bg-primary-hover transition-colors shadow-sm"
          >
            Try again
          </button>
          <Link 
            href="/" 
            className="w-full bg-white text-gray-900 border border-gray-200 py-3 rounded-full font-bold hover:bg-gray-50 transition-colors"
          >
            Go back home
          </Link>
        </div>
        
        <div className="pt-24 opacity-20 select-none">
          <span className="text-6xl font-black text-gray-200">500</span>
        </div>
      </div>
    </div>
  )
}
