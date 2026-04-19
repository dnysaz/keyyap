'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Save, Lock, ChevronRight, ArrowLeft, X, Smile, Flag, Zap, LogOut } from 'lucide-react'
import Navigation from '@/components/Navigation'
import Sidebar from '@/components/Sidebar'
import RightSidebar from '@/components/RightSidebar'
import Avatar from '@/components/Avatar'
import { Camera, Image as ImageIcon } from 'lucide-react'
import { compressImage, getBannerGradient } from '@/lib/image-utils'
import ImageCropperModal from '@/components/ImageCropperModal'

import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/stores/authStore'

interface ProfileData {
  username: string
  full_name: string
  avatar_url: string
  cover_url: string
  bio: string
  website: string
}

const EMOJI_CATEGORIES = [
  {
    name: 'Faces',
    icon: Smile,
    emojis: ["😀", "😎", "🤩", "😊", "🤔", "🧐", "😴", "😇", "🥳", "🤡"]
  },
  {
    name: 'Mixed',
    icon: Zap,
    emojis: ["🔥", "🚀", "⚡️", "✨", "🌟", "💡", "🎨", "🎮", "🎧", "💎"]
  },
  {
    name: 'Flags',
    icon: Flag,
    emojis: [
      "🇮🇩", "🇲🇾", "🇸🇬", "🇵🇭", "🇹🇭", "🇻🇳", "🇯🇵", "🇰🇷", "🇨🇳", "🇮🇳",
      "🇺🇸", "🇬🇧", "🇨🇦", "🇦🇺", "🇩🇪", "🇫🇷", "🇮🇹", "🇪🇸", "🇧🇷", "🇦🇷",
      "🇳🇱", "🇸🇪", "🇨🇭", "🇹🇷", "🇸🇦", "🇦🇪", "🇶🇦", "🇪🇬", "🇿🇦", "🇲🇽",
      "🇵🇹", "🇬🇷", "🇧🇪", "🇦🇹", "🇩🇰", "🇳🇴", "🇫🇮", "🇵🇱", "🇺🇦", "🇷🇺",
      "🇲🇦", "🇹🇳", "🇰🇪", "🇳🇬", "🇨🇱", "🇵🇪", "🇨🇴", "🇺🇾", "🇳🇿", "🇮🇪"
    ]
  }
]

export default function SettingsPage() {
  const router = useRouter()
  const { user, profile: currentProfile, loadProfile } = useAuthStore()
  const [profile, setProfile] = useState<ProfileData>({
    username: '',
    full_name: '',
    avatar_url: '',
    cover_url: '',
    bio: '',
    website: ''
  })
  const [saving, setSaving] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [uploadingCover, setUploadingCover] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [showEmojiModal, setShowEmojiModal] = useState(false)
  const [cropConfig, setCropConfig] = useState<{
    isOpen: boolean
    imageSrc: string
    type: 'avatar' | 'cover'
  } | null>(null)

  useEffect(() => {
    if (currentProfile) {
      setProfile({
        username: currentProfile.username || '',
        full_name: currentProfile.full_name || '',
        avatar_url: currentProfile.avatar_url || '',
        cover_url: (currentProfile as any).cover_url || '',
        bio: (currentProfile as any).bio || '',
        website: (currentProfile as any).website || ''
      })
    }
  }, [currentProfile])

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!user) return

    setSaving(true)
    setError('')
    setSuccess('')

    const { error: updateError } = await supabase
      .from('profiles')
      .update({
        full_name: profile.full_name,
        avatar_url: profile.avatar_url,
        cover_url: profile.cover_url,
        bio: profile.bio,
        website: profile.website,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id)

    if (updateError) {
      setError(updateError.message)
    } else {
      setSuccess('Profile updated!')
      await loadProfile()
    }
    setSaving(false)
  }

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>, type: 'avatar' | 'cover') => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0]
      const reader = new FileReader()
      reader.addEventListener('load', () => {
        setCropConfig({
          isOpen: true,
          imageSrc: reader.result?.toString() || '',
          type
        })
      })
      reader.readAsDataURL(file)
      // reset input
      e.target.value = ''
    }
  }

  const handleCropComplete = async (croppedBlob: Blob) => {
    if (!cropConfig || !user) return
    const type = cropConfig.type
    setCropConfig(null)

    if (type === 'avatar') setUploadingAvatar(true)
    else setUploadingCover(true)
    
    setError('')

    try {
      const file = new File([croppedBlob], `cropped-${Date.now()}.jpeg`, { type: 'image/jpeg' })
      const compressedBlob = await compressImage(file, type === 'avatar' ? 400 : 1000, 0.6)
      
      const bucket = type === 'avatar' ? 'avatars' : 'covers'
      const fileName = `${user.id}/${Date.now()}.webp`
      
      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(fileName, compressedBlob, {
          contentType: 'image/webp',
          upsert: true
        })

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(fileName)

      setProfile(p => ({ ...p, [type === 'avatar' ? 'avatar_url' : 'cover_url']: publicUrl }))
      setSuccess(`${type === 'avatar' ? 'Avatar' : 'Cover'} uploaded! (${(compressedBlob.size / 1024).toFixed(0)}KB)`)
      
    } catch (err: any) {
      setError(err.message)
    } finally {
      if (type === 'avatar') setUploadingAvatar(false)
      else setUploadingCover(false)
    }
  }

  const selectEmoji = (emoji: string) => {
    setProfile(p => ({ ...p, avatar_url: emoji }))
    setShowEmojiModal(false)
  }

  return (
    <div className="min-h-screen bg-white">
      <Sidebar />
      <div className="lg:ml-[68px] xl:ml-[275px] flex justify-center">
        <div className="flex w-full max-w-[1050px]">
          <div className="flex-1 max-w-2xl border-r border-l border-gray-100 min-h-screen">
          <div className="sticky top-0 bg-white/80 backdrop-blur-sm border-b border-gray-100 px-4 py-3 flex items-center gap-4 z-10 shrink-0">
            <button 
              onClick={() => router.back()} 
              className="p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-600" />
            </button>
            <h1 className="font-bold text-lg">Edit Profile</h1>
          </div>

          <form onSubmit={handleSave} className="p-0 space-y-6 pb-48">
            {/* Header / Banner Area */}
            <div className="relative h-48 bg-gray-100 group">
              {profile.cover_url ? (
                <img src={profile.cover_url} alt="Cover" className="w-full h-full object-cover" />
              ) : (
                <div className={`w-full h-full bg-gradient-to-r ${getBannerGradient(user?.id || '')}`} />
              )}
              
              <label className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
                <div className="bg-white/90 p-3 rounded-full shadow-lg">
                  <Camera className="w-6 h-6 text-gray-700" />
                </div>
                <input 
                  type="file" 
                  accept="image/*" 
                  className="hidden" 
                  onChange={(e) => handleImageSelect(e, 'cover')}
                  disabled={uploadingCover}
                />
              </label>
              
              {uploadingCover && (
                <div className="absolute inset-0 bg-white/60 flex items-center justify-center">
                  <div className="flex flex-col items-center gap-2">
                    <div className="spinner border-primary/20 border-t-primary w-8 h-8" />
                    <span className="text-xs font-bold text-primary">Compressing...</span>
                  </div>
                </div>
              )}

              {/* Avatar Positioned Overlay */}
              <div className="absolute -bottom-14 left-6 group/avatar">
                <div className="relative">
                   <div className="bg-white p-1 rounded-full shadow-lg ring-4 ring-white">
                     <Avatar 
                      url={profile.avatar_url} 
                      username={profile.username} 
                      size="xl" 
                      className="ring-0"
                    />
                  </div>
                  <label className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full opacity-0 group-hover/avatar:opacity-100 transition-opacity cursor-pointer">
                    <Camera className="w-6 h-6 text-white" />
                    <input 
                      type="file" 
                      accept="image/*" 
                      className="hidden" 
                      onChange={(e) => handleImageSelect(e, 'avatar')}
                      disabled={uploadingAvatar}
                    />
                  </label>
                </div>
              </div>
            </div>

            <div className="pt-20 px-4 space-y-8">
              <div className="flex items-center justify-end">
                 <button 
                  type="button"
                  onClick={() => setShowEmojiModal(true)}
                  className="text-xs font-bold text-primary hover:bg-orange-50 px-3 py-1.5 rounded-full border border-orange-100 transition-colors"
                >
                  Use Emoji instead?
                </button>
              </div>

            {error && (
              <div className="p-3 bg-red-50 text-red-600 text-sm rounded-xl border border-red-100 flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse"></div>
                {error}
              </div>
            )}
            {success && (
              <div className="p-3 bg-green-50 text-green-600 text-sm rounded-xl border border-green-100 flex items-center gap-2">
                 <div className="w-1.5 h-1.5 rounded-full bg-green-600"></div>
                {success}
              </div>
            )}

            <div className="space-y-6">

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
                <input
                  type="text"
                  value={profile.username}
                  className="w-full px-4 py-2 border border-gray-100 bg-gray-50 rounded-lg text-sm text-gray-500 cursor-not-allowed"
                  disabled
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={user?.email || ''}
                  className="w-full px-4 py-2 border border-gray-100 bg-gray-50 rounded-lg text-sm text-gray-500 cursor-not-allowed"
                  disabled
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Display Name</label>
              <input
                type="text"
                value={profile.full_name}
                onChange={(e) => setProfile(p => ({ ...p, full_name: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:border-primary outline-none"
                placeholder="Your display name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Bio</label>
              <textarea
                value={profile.bio}
                onChange={(e) => setProfile(p => ({ ...p, bio: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:border-primary outline-none"
                rows={3}
                placeholder="Tell us about yourself"
                maxLength={160}
              />
              <p className="text-xs text-gray-400 mt-1 text-right">{profile.bio.length}/160</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Website</label>
              <input
                type="url"
                value={profile.website}
                onChange={(e) => setProfile(p => ({ ...p, website: e.target.value }))}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg text-sm focus:border-primary outline-none"
                placeholder="https://yourwebsite.com"
              />
            </div>

            <button
              type="submit"
              disabled={saving || uploadingAvatar || uploadingCover}
              className="w-full bg-primary text-white py-4 rounded-xl font-bold hover:bg-primary-hover disabled:opacity-50 flex items-center justify-center gap-2 transition-all active:scale-[0.98] shadow-lg shadow-orange-100"
            >
              <Save className="w-5 h-5" />
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>

            <div className="pt-6 border-t border-gray-100 space-y-3">
              <Link
                href="/settings/feed"
                className="w-full flex items-center justify-between p-4 border border-gray-100 rounded-xl hover:bg-gray-50 transition-colors group"
              >
                <div className="flex items-center gap-3 text-gray-700">
                  <div className="p-2 bg-orange-50 text-orange-600 rounded-lg">
                    <Zap className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm">Feed Settings</p>
                    <p className="text-xs text-gray-500">Manage your visibility and feed preferences</p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-gray-400 transition-colors" />
              </Link>

              <Link
                href="/settings/password"
                className="w-full flex items-center justify-between p-4 border border-gray-100 rounded-xl hover:bg-gray-50 transition-colors group"
              >
                <div className="flex items-center gap-3 text-gray-700">
                  <div className="p-2 bg-orange-50 text-orange-600 rounded-lg">
                    <Lock className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm">Change Password</p>
                    <p className="text-xs text-gray-500">Update your security credentials</p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-gray-400 transition-colors" />
              </Link>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={async () => {
                  await supabase.auth.signOut()
                  router.push('/login')
                }}
                className="w-full flex items-center justify-between p-4 border border-gray-100 rounded-xl hover:bg-gray-50 transition-colors group text-left"
              >
                <div className="flex items-center gap-3 text-gray-700">
                  <div className="p-2 bg-orange-50 text-orange-600 rounded-lg group-hover:bg-orange-100 transition-colors">
                    <LogOut className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-semibold text-sm">Logout</p>
                    <p className="text-xs text-gray-500">Sign out of your account</p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-300 group-hover:text-gray-400 transition-colors" />
              </button>
            </div>
          </form>

          {/* Settings Footer */}
          <div className="px-6 pt-12 pb-32 flex flex-col items-center border-t border-gray-50 bg-gray-50/30">
            <div className="flex flex-wrap justify-center gap-x-4 gap-y-2 mb-4 text-[12px] font-medium text-gray-500">
              <Link href="/terms" className="hover:text-primary transition-colors">Terms</Link>
              <Link href="/privacy" className="hover:text-primary transition-colors">Privacy Policy</Link>
              <Link href="/cookies" className="hover:text-primary transition-colors">Cookie Policy</Link>
            </div>
            
            <div className="flex flex-col items-center gap-1">
              <p className="text-[11px] text-gray-400 font-medium">© {new Date().getFullYear()} KeyYap! Inc.</p>
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-[11px] font-bold text-gray-500">Version 1.0 (Beta)</span>
              </div>
            </div>
          </div>
          </div>
          <RightSidebar />
        </div>
      </div>

      {/* Emoji Modal */}
      {showEmojiModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div 
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setShowEmojiModal(false)}
          />
          <div className="relative bg-white w-full max-w-sm rounded-[2rem] shadow-2xl overflow-hidden flex flex-col max-h-[80vh]">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between shrink-0">
              <h3 className="font-bold text-lg text-gray-900">Choose your Emoji</h3>
              <button 
                onClick={() => setShowEmojiModal(false)}
                className="p-1 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="overflow-y-auto p-6 no-scrollbar">
              <div className="space-y-8">
                {EMOJI_CATEGORIES.map((cat) => (
                  <div key={cat.name}>
                    <div className="flex items-center gap-2 mb-4 text-gray-400">
                      <cat.icon className="w-4 h-4" />
                      <span className="text-xs font-bold uppercase tracking-wider">{cat.name}</span>
                    </div>
                    <div className="grid grid-cols-5 gap-3">
                      {cat.emojis.map((emoji) => (
                        <button
                          key={emoji}
                          type="button"
                          onClick={() => selectEmoji(emoji)}
                          className="aspect-square text-3xl flex items-center justify-center hover:bg-orange-50 rounded-2xl transition-all hover:scale-110 active:scale-95 border border-transparent hover:border-orange-100"
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {cropConfig?.isOpen && (
        <ImageCropperModal
          imageSrc={cropConfig.imageSrc}
          aspectRatio={cropConfig.type === 'avatar' ? 1 : 3}
          isCircle={cropConfig.type === 'avatar'}
          onCropComplete={handleCropComplete}
          onCancel={() => setCropConfig(null)}
        />
      )}

      <div className="lg:hidden">
        <Navigation />
      </div>
    </div>
  )
}