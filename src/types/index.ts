export interface Profile {
  id: string
  username: string
  full_name: string | null
  avatar_url: string | null
  bio: string | null
  website: string | null
  is_private: boolean
  created_at: string
  updated_at: string
}

export interface Post {
  id: string
  user_id: string
  content: string
  hashtags: string[] | null
  likes_count: number
  comments_count: number
  shares_count: number
  views_count: number
  created_at: string
  updated_at: string
  is_deleted: boolean
  quoted_post_id: string | null
  profiles?: Profile
  post_likes?: PostLike[]
  is_liked?: boolean
  quoted_post?: Post
}

export interface PostLike {
  id: string
  user_id: string
  post_id: string
  created_at: string
}

export interface Follow {
  id: string
  follower_id: string
  following_id: string
  created_at: string
}

export interface Comment {
  id: string
  user_id: string
  post_id: string
  content: string
  created_at: string
  updated_at: string
  is_deleted: boolean
  profiles?: Profile
}

export interface Trending {
  id: string
  hashtag: string
  post_count: number
  trending_score: number
  updated_at: string
}

export interface User {
  id: string
  email: string
}