'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Save, Eye, EyeOff, Trash2, ChevronRight, X } from 'lucide-react'
import Sidebar from '@/components/Sidebar'
import RightSidebar from '@/components/RightSidebar'
import Navigation from '@/components/Navigation'
import { supabase } from '@/lib/supabase'
import AuthGuard from '@/components/AuthGuard'
import { useAuthStore } from '@/stores/authStore'

export default function PasswordSettingsPage() {
  const router = useRouter()
  const { user, signOut } = useAuthStore()
  
  // Change Password States
  const [oldPassword, setOldPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  // Delete Account States
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleteConfirmation, setDeleteConfirmation] = useState('')
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  async function handleUpdatePassword(e: React.FormEvent) {
    e.preventDefault()
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match')
      return
    }
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters')
      return
    }

    setLoading(true)
    setError('')
    setSuccess('')

    try {
      const { error: verifyError } = await supabase.auth.signInWithPassword({
        email: user?.email || '',
        password: oldPassword
      })
      if (verifyError) {
        setError('Incorrect old password')
        setLoading(false)
        return
      }
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword
      })
      if (updateError) {
        setError(updateError.message)
      } else {
        setSuccess('Password updated successfully!')
        setOldPassword('')
        setNewPassword('')
        setConfirmPassword('')
      }
    } catch (err) {
      setError('An error occurred')
    } finally {
      setLoading(false)
    }
  }

  async function handleDeleteAccount(e: React.FormEvent) {
    e.preventDefault()
    if (!user) return
    setDeleteLoading(true)
    setDeleteError('')

    try {
      if (deleteConfirmation !== 'delete my account') {
        setDeleteError('Please type the confirmation phrase exactly')
        setDeleteLoading(false)
        return
      }
      const { error: profileDeleteError } = await supabase
        .from('profiles')
        .delete()
        .eq('id', user.id)
      if (profileDeleteError) {
        setDeleteError(profileDeleteError.message)
        setDeleteLoading(false)
        return
      }
      await signOut()
      router.push('/')
    } catch (err) {
      setDeleteError('Failed to delete account')
    } finally {
      setDeleteLoading(false)
    }
  }

  const togglePasswordVisibility = () => setShowPassword(!showPassword)

  return (
    <AuthGuard>
      <div className="min-h-screen bg-white">
        <Sidebar />
        <div className="lg:ml-[68px] xl:ml-[275px] flex justify-center">
          <div className="flex w-full max-w-[1050px]">
            <main className="flex-1 max-w-2xl border-x border-gray-100 min-h-screen">
              <div className="sticky top-0 bg-white/80 backdrop-blur-md z-10 px-4 py-3 border-b border-gray-50 flex items-center gap-4">
                <button onClick={() => router.back()} className="p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors">
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <h1 className="text-xl font-bold">Change Password</h1>
              </div>

                <div className="p-4 max-w-md mx-auto mt-8">
                  {user?.provider === 'google' ? (
                    <div className="bg-blue-50/50 border border-blue-100 p-6 rounded-2xl text-center space-y-4">
                      <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mx-auto shadow-sm">
                        <svg className="w-6 h-6" viewBox="0 0 24 24">
                          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.06-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                        </svg>
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-900 mb-1">Managed by Google</h3>
                        <p className="text-sm text-gray-600 leading-relaxed">
                          Your account is linked with Google. Please manage your password and security settings directly through your Google account.
                        </p>
                      </div>
                      <a 
                        href="https://myaccount.google.com/security" 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="inline-block text-sm font-bold text-primary hover:underline pt-2"
                      >
                        Manage Google Settings →
                      </a>
                    </div>
                  ) : (
                    <form onSubmit={handleUpdatePassword} className="space-y-6">
                      {error && <div className="p-3 bg-red-50 text-red-600 text-sm rounded-xl border border-red-100">{error}</div>}
                      {success && <div className="p-3 bg-green-50 text-green-600 text-sm rounded-xl border border-green-100">{success}</div>}

                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Old Password</label>
                          <div className="relative">
                            <input
                              type={showPassword ? 'text' : 'password'}
                              value={oldPassword}
                              onChange={(e) => setOldPassword(e.target.value)}
                              className="w-full px-4 py-3 border border-gray-200 rounded-xl outline-none focus:ring-1 focus:ring-primary pr-12"
                              placeholder="••••••••"
                              required
                            />
                            <button type="button" onClick={togglePasswordVisibility} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">
                              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                            </button>
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">New Password</label>
                          <div className="relative">
                            <input
                              type={showPassword ? 'text' : 'password'}
                              value={newPassword}
                              onChange={(e) => setNewPassword(e.target.value)}
                              className="w-full px-4 py-3 border border-gray-200 rounded-xl outline-none focus:ring-1 focus:ring-primary pr-12"
                              placeholder="••••••••"
                              required
                            />
                            <button type="button" onClick={togglePasswordVisibility} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">
                              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                            </button>
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Confirm New Password</label>
                          <div className="relative">
                            <input
                              type={showPassword ? 'text' : 'password'}
                              value={confirmPassword}
                              onChange={(e) => setConfirmPassword(e.target.value)}
                              className="w-full px-4 py-3 border border-gray-200 rounded-xl outline-none focus:ring-1 focus:ring-primary pr-12"
                              placeholder="••••••••"
                              required
                            />
                            <button type="button" onClick={togglePasswordVisibility} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400">
                              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                            </button>
                          </div>
                        </div>
                      </div>

                      <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-primary text-white py-3.5 rounded-xl font-bold hover:bg-primary-hover transition-all disabled:opacity-50"
                      >
                        {loading ? 'Updating...' : 'Update Password'}
                      </button>
                    </form>
                  )}

                <div className="mt-20 pt-8 border-t border-gray-50">
                   <button
                    onClick={() => setShowDeleteModal(true)}
                    className="w-full flex items-center justify-between p-4 border border-gray-100 rounded-xl hover:bg-red-50 hover:border-red-100 transition-all group"
                  >
                    <div className="flex items-center gap-3 text-gray-700">
                      <div className="p-2 bg-red-50 text-red-500 rounded-lg group-hover:bg-red-100 transition-colors">
                        <Trash2 className="w-5 h-5" />
                      </div>
                      <div className="text-left">
                        <p className="font-semibold text-sm group-hover:text-red-600 transition-colors">Delete Account</p>
                        <p className="text-xs text-gray-500">Permanently remove your account and data</p>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-red-400 transition-colors" />
                  </button>
                </div>
              </div>
            </main>
            <RightSidebar />
          </div>
        </div>
        <div className="lg:hidden">
          <Navigation />
        </div>

        {/* Login-styled Delete Modal */}
        {showDeleteModal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowDeleteModal(false)} />
            <div className="relative bg-white w-full max-w-[400px] rounded-[2rem] overflow-hidden flex flex-col animate-in zoom-in duration-300">
              <div className="p-4 border-b border-gray-100 flex items-center justify-between">
                <button onClick={() => setShowDeleteModal(false)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                  <X className="w-5 h-5" />
                </button>
                <span className="text-2xl font-black text-primary tracking-tighter">K</span>
                <div className="w-9" />
              </div>
              
              <div className="p-8">
                <h3 className="text-2xl font-bold mb-2">Delete Account?</h3>
                <p className="text-gray-500 text-sm mb-6">
                  Deleting your account will permanently remove all your <span className="font-bold text-gray-800">posts, comments, and likes</span> from KeyYap. This action is irreversible.
                </p>

                {deleteError && (
                   <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm mb-6 border border-red-100 flex items-center gap-2">
                    <div className="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse"></div>
                    {deleteError}
                  </div>
                )}

                <form onSubmit={handleDeleteAccount} className="space-y-5">
                  <div className="group relative">
                    <input
                      type="text"
                      value={deleteConfirmation}
                      onChange={(e) => setDeleteConfirmation(e.target.value)}
                      placeholder=" "
                      className="peer w-full px-4 pt-6 pb-2 rounded-lg border border-gray-300 bg-white text-gray-900 text-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all pr-12"
                      required
                      autoFocus
                    />
                    <label className="absolute left-4 top-4 text-gray-500 transition-all pointer-events-none origin-left peer-focus:-translate-y-3 peer-focus:scale-75 peer-[:not(:placeholder-shown)]:-translate-y-3 peer-[:not(:placeholder-shown)]:scale-75">
                      Type 'delete my account'
                    </label>
                  </div>

                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={deleteLoading || deleteConfirmation !== 'delete my account'}
                      className="w-full bg-red-600 text-white py-4 rounded-full font-bold text-lg hover:bg-red-700 transition-all duration-200 active:scale-95 disabled:opacity-50"
                    >
                      {deleteLoading ? 'Processing...' : 'Delete permanently'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </AuthGuard>
  )
}
