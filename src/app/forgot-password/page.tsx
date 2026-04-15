'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Mail, CheckCircle2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'

export default function ForgotPasswordPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })

    if (error) {
      setError(error.message)
    } else {
      setSubmitted(true)
    }
    setLoading(false)
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center space-y-6 animate-in fade-in zoom-in duration-500">
          <div className="flex justify-center">
            <div className="p-4 bg-green-50 text-green-500 rounded-full">
              <CheckCircle2 className="w-16 h-16" />
            </div>
          </div>
          <h1 className="text-3xl font-extrabold text-gray-900">Check your email</h1>
          <p className="text-gray-600">
            We've sent a password reset link to <span className="font-bold text-gray-900">{email}</span>. Please check your inbox and follow the instructions.
          </p>
          <div className="pt-4">
            <Link 
              href="/login" 
              className="inline-flex items-center gap-2 text-primary font-bold hover:underline"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Sign in
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white md:bg-gray-100 flex items-center justify-center p-0 md:p-4">
      <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1614850523459-c2f4c699c52e?q=80&w=2070&auto=format&fit=crop')] bg-cover bg-center opacity-5 hidden md:block"></div>
      
      <div className="bg-white w-full h-full md:h-auto md:max-w-[600px] md:rounded-3xl relative z-10 flex flex-col overflow-hidden animate-in fade-in zoom-in duration-300">
        <div className="flex items-center justify-between px-4 py-3 border-b md:border-none">
          <button 
            onClick={() => router.back()} 
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-900" />
          </button>
          <div className="absolute left-1/2 -translate-x-1/2">
             <span className="text-3xl font-black text-primary tracking-tighter">K</span>
          </div>
          <div className="w-10" />
        </div>

        <div className="flex-1 overflow-y-auto px-8 py-6 md:px-16 md:py-10">
          <div className="max-w-[364px] mx-auto">
            <h1 className="text-3xl font-extrabold text-gray-900 mb-2 tracking-tight">
              Reset Password
            </h1>
            <p className="text-gray-500 mb-8">
              Enter your email address and we'll send you a link to reset your password.
            </p>

            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm mb-6 border border-red-100 flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse"></div>
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="group relative">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder=" "
                  className="peer w-full px-4 pt-6 pb-2 rounded-lg border border-gray-300 bg-white text-gray-900 text-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                  required
                />
                <label className="absolute left-4 top-4 text-gray-500 transition-all pointer-events-none origin-left peer-focus:-translate-y-3 peer-focus:scale-75 peer-[:not(:placeholder-shown)]:-translate-y-3 peer-[:not(:placeholder-shown)]:scale-75">
                  Email
                </label>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gray-900 text-white py-3.5 rounded-full font-bold text-lg hover:bg-black transition-all duration-200 active:scale-95 disabled:opacity-50"
              >
                {loading ? 'Sending link...' : 'Send reset link'}
              </button>
            </form>

            <div className="mt-8 text-center">
              <Link href="/login" className="text-gray-600 hover:text-primary transition-colors text-sm">
                Remember your password? <span className="text-primary font-bold hover:underline">Log in</span>
              </Link>
            </div>
          </div>
        </div>

        <div className="px-8 py-10 text-center text-[13px] text-gray-500 bg-gray-50/50 md:bg-white">
          Enter your registered email to receive recovery instructions.
        </div>
      </div>
    </div>
  )
}
