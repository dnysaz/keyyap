'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { X, Eye, EyeOff } from 'lucide-react'

export default function SignupPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [fullName, setFullName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  const forbiddenUsernames = [
    'admin', 'system', 'keyyap', 'support', 'official', 'moderator', 'mod', 'root',
    'dev', 'developer', 'staff', 'help', 'info', 'contact', 'webmaster', 'security',
    'administrator', 'keyyap_official', 'keyyapsystem', 'keyyap', 'keyyap.com'
  ]

  const badWords = [
    // English
    'fuck', 'shit', 'bitch', 'asshole', 'pussy', 'dick', 'cunt', 'bastard', 'slut', 'whore',
    // Indonesian
    'anjing', 'babi', 'bangsat', 'kontol', 'memek', 'jembut', 'peler', 'itil', 'lonte', 'pelacur',
    'asu', 'bajingan', 'ngentot', 'ngewe', 'peju', 'coli'
  ]

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const cleanUsername = username.toLowerCase().trim()

    // 1. Basic length check
    if (cleanUsername.length < 3) {
      setError('Username must be at least 3 characters')
      setLoading(false)
      return
    }

    // 2. System terms check
    if (forbiddenUsernames.some(term => cleanUsername.includes(term))) {
      setError('This username is reserved for system use')
      setLoading(false)
      return
    }

    // 3. Bad words check
    if (badWords.some(word => cleanUsername.includes(word))) {
      setError('Username contains restricted words')
      setLoading(false)
      return
    }

    // 4. Uniqueness check
    const { data: existingUser, error: checkError } = await supabase
      .from('profiles')
      .select('username')
      .eq('username', cleanUsername)
      .single()

    if (existingUser) {
      setError('Username is already taken')
      setLoading(false)
      return
    }

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          username: cleanUsername,
          full_name: fullName,
        },
      },
    })

    if (signUpError) {
      setError(signUpError.message)
      setLoading(false)
      return
    }

    if (data.user) {
      // Profile is handled automatically by database trigger (handle_new_user)
      router.push('/')
    }
  }

  const handleGoogleSignup = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: typeof window !== 'undefined' ? `${window.location.origin}/` : '/',
      },
    })
  }

  return (
    <div className="min-h-screen bg-white md:bg-gray-100 flex items-center justify-center p-0 md:p-4">
      {/* Background overlay for desktop */}
      <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1557683316-973673baf926?q=80&w=2029&auto=format&fit=crop')] bg-cover bg-center opacity-5 hidden md:block"></div>

      <div className="bg-white w-full h-full md:h-auto md:max-w-[600px] md:rounded-3xl relative z-10 flex flex-col overflow-hidden animate-in fade-in slide-in-from-bottom-8 duration-500">
        {/* Header - Logo and Close button */}
        <div className="flex items-center justify-between px-4 py-3 border-b md:border-none">
          <button
            onClick={() => router.push('/')}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5 text-gray-900" />
          </button>
          <div className="absolute left-1/2 -translate-x-1/2">
            <span className="text-3xl font-black text-primary tracking-tighter">K</span>
          </div>
          <div className="w-10" />
        </div>

        <div className="flex-1 overflow-y-auto px-8 py-6 md:px-16 md:py-8">
          <div className="max-w-[364px] mx-auto">
            <h1 className="text-3xl font-extrabold text-gray-900 mb-8 tracking-tight">
              Join KeyYap today
            </h1>

            {/* Social Login */}
            <button
              onClick={handleGoogleSignup}
              className="w-full flex items-center justify-center gap-3 bg-white border border-gray-300 py-3 rounded-full font-bold text-gray-700 hover:bg-gray-50 transition-all duration-200 mb-4 group"
            >
              <svg className="w-5 h-5 group-hover:scale-110 transition-transform" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Sign up with Google
            </button>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-white text-gray-500 font-medium">or create account</span>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm mb-6 border border-red-100 flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse"></div>
                {error}
              </div>
            )}

            {/* Signup Form */}
            <form onSubmit={handleSignup} className="space-y-5">
              <div className="group relative">
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder=" "
                  className="peer w-full px-4 pt-6 pb-2 rounded-lg border border-gray-300 bg-white text-gray-900 text-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                  required
                />
                <label className="absolute left-4 top-4 text-gray-500 transition-all pointer-events-none origin-left peer-focus:-translate-y-3 peer-focus:scale-75 peer-[:not(:placeholder-shown)]:-translate-y-3 peer-[:not(:placeholder-shown)]:scale-75">
                  Name
                </label>
              </div>

              <div className="group relative">
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s/g, '_'))}
                  placeholder=" "
                  className="peer w-full px-4 pt-6 pb-2 rounded-lg border border-gray-300 bg-white text-gray-900 text-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all"
                  required
                />
                <label className="absolute left-4 top-4 text-gray-500 transition-all pointer-events-none origin-left peer-focus:-translate-y-3 peer-focus:scale-75 peer-[:not(:placeholder-shown)]:-translate-y-3 peer-[:not(:placeholder-shown)]:scale-75">
                  Username (@yourname)
                </label>
              </div>

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

              <div className="group relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder=" "
                  className="peer w-full px-4 pt-6 pb-2 rounded-lg border border-gray-300 bg-white text-gray-900 text-lg focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all pr-12"
                  minLength={6}
                  required
                />
                <label className="absolute left-4 top-4 text-gray-500 transition-all pointer-events-none origin-left peer-focus:-translate-y-3 peer-focus:scale-75 peer-[:not(:placeholder-shown)]:-translate-y-3 peer-[:not(:placeholder-shown)]:scale-75">
                  Password
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
                className="w-full bg-gray-900 text-white py-4 rounded-full font-bold text-lg hover:bg-black transition-all duration-200 active:scale-95 disabled:opacity-50 mt-4"
              >
                {loading ? 'Creating account...' : 'Create account'}
              </button>
            </form>

            <div className="mt-8 text-gray-600 text-[15px]">
              Already have an account?{' '}
              <Link href="/login" className="text-primary font-bold hover:underline">
                Log in
              </Link>
            </div>
          </div>
        </div>

        <div className="px-8 py-8 md:py-10 text-[13px] text-gray-500 bg-gray-50/50 md:bg-white text-center md:text-left">
          By signing up, you agree to the <span className="text-primary hover:underline cursor-pointer">Terms of Service</span> and <span className="text-primary hover:underline cursor-pointer">Privacy Policy</span>, including <span className="text-primary hover:underline cursor-pointer">Cookie Use</span>.
        </div>
      </div>
    </div>
  )
}