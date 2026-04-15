'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Save, Eye, EyeOff, Lock, CheckCircle2, ArrowLeft } from 'lucide-react'
import { supabase } from '@/lib/supabase'

export default function ResetPasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  // When arriving here from the email link, Supabase might already have the session
  useEffect(() => {
    supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        // We are in password recovery mode
      }
    })
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    setLoading(true)
    setError('')

    const { error } = await supabase.auth.updateUser({ password })

    if (error) {
      setError(error.message)
    } else {
      setSuccess(true)
      setTimeout(() => {
        router.push('/login')
      }, 3000)
    }
    setLoading(false)
  }

  if (success) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center space-y-6 animate-in fade-in zoom-in duration-500">
          <div className="flex justify-center">
            <div className="p-4 bg-green-50 text-green-500 rounded-full">
              <CheckCircle2 className="w-16 h-16" />
            </div>
          </div>
          <h1 className="text-3xl font-extrabold text-gray-900">Success!</h1>
          <p className="text-gray-600">
            Your password has been reset successfully. You will be redirected to the login page shortly.
          </p>
          <div className="pt-4 animate-pulse text-sm text-gray-400">
            Redirecting in 3 seconds...
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
            onClick={() => router.push('/login')} 
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
              New Password
            </h1>
            <p className="text-gray-500 mb-8">
              Please enter your new password below.
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
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder=" "
                  className="peer w-full px-4 pt-6 pb-2 rounded-lg border border-gray-300 bg-white text-gray-900 text-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all pr-12"
                  required
                />
                <label className="absolute left-4 top-4 text-gray-500 transition-all pointer-events-none origin-left peer-focus:-translate-y-3 peer-focus:scale-75 peer-[:not(:placeholder-shown)]:-translate-y-3 peer-[:not(:placeholder-shown)]:scale-75">
                  New Password
                </label>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 bottom-2.5 p-1 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>

              <div className="group relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder=" "
                  className="peer w-full px-4 pt-6 pb-2 rounded-lg border border-gray-300 bg-white text-gray-900 text-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all pr-12"
                  required
                />
                <label className="absolute left-4 top-4 text-gray-500 transition-all pointer-events-none origin-left peer-focus:-translate-y-3 peer-focus:scale-75 peer-[:not(:placeholder-shown)]:-translate-y-3 peer-[:not(:placeholder-shown)]:scale-75">
                  Confirm Password
                </label>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 bottom-2.5 p-1 text-gray-400 hover:text-gray-600 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gray-900 text-white py-3.5 rounded-full font-bold text-lg hover:bg-black transition-all duration-200 active:scale-95 disabled:opacity-50"
              >
                {loading ? 'Setting password...' : 'Set new password'}
              </button>
            </form>
          </div>
        </div>

        <div className="px-8 py-10 text-center text-[13px] text-gray-500 bg-gray-50/50 md:bg-white">
          Secure your account with a strong, unique password.
        </div>
      </div>
    </div>
  )
}
