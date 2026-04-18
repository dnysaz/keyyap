import { Metadata } from 'next'
import { supabase } from '@/lib/supabase'
import ProfileClient from './ProfileClient'

interface Props {
  params: Promise<{ username: string }>
}

// 1. DYNAMIC METADATA GENERATION (Server Side)
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params

  // Fetch profile data from Supabase
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, username, avatar_url, bio')
    .eq('username', username)
    .single()

  if (!profile) {
    return {
      title: 'User Not Found | KeyYap',
    }
  }

  const displayName = profile.full_name || profile.username
  const description = profile.bio || `Check out ${displayName}'s profile on KeyYap.`
  
  // Use profile avatar as OG Image, with a fallback if empty
  const ogImage = profile.avatar_url || 'https://keyyap.com/og-default.png' 

  return {
    title: `${displayName} (@${profile.username}) | KeyYap`,
    description,
    openGraph: {
      title: `${displayName} (@${profile.username})`,
      description,
      images: [
        {
          url: ogImage,
          width: 400,
          height: 400,
          alt: displayName,
        },
      ],
      type: 'profile',
    },
    twitter: {
      card: 'summary',
      title: `${displayName} (@${profile.username})`,
      description,
      images: [ogImage],
    },
  }
}

// 2. SERVER PAGE COMPONENT
export default async function ProfilePage({ params }: Props) {
  const { username } = await params

  // Initial fetch for the client component
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('username', username)
    .single()

  return (
    <ProfileClient 
      initialProfile={profile} 
      username={username} 
    />
  )
}