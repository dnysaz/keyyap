-- =========================================================================
-- KeyYap.com - COMPLETE CONSOLIDATED BACKEND SCHEMA (v3.0)
-- =========================================================================
-- This script contains all tables, policies, functions, triggers, and 
-- security patches required for the KeyYap application backend.
-- Run this entire script in your Supabase SQL Editor.
-- =========================================================================

-- ============================================
-- 1. PROFILES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username VARCHAR(50) UNIQUE NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  bio TEXT,
  website TEXT,
  is_private BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT username_length CHECK (char_length(username) >= 3)
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "profiles_select_public" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_auth" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_auth" ON public.profiles;
DROP POLICY IF EXISTS "profiles_delete_auth" ON public.profiles;

CREATE POLICY "profiles_select_public" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "profiles_insert_auth" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update_auth" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "profiles_delete_auth" ON public.profiles FOR DELETE USING (auth.uid() = id);

-- ============================================
-- 2. POSTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT, -- Nullable to allow simple reposts as quote posts
  hashtags JSONB,
  likes_count INTEGER DEFAULT 0,
  comments_count INTEGER DEFAULT 0,
  shares_count INTEGER DEFAULT 0,
  views_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  is_deleted BOOLEAN DEFAULT false,
  quoted_post_id UUID REFERENCES public.posts(id) ON DELETE SET NULL
);

-- Ensure column exists if table was already created in earlier version
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS quoted_post_id UUID REFERENCES public.posts(id) ON DELETE SET NULL;
ALTER TABLE public.posts ADD COLUMN IF NOT EXISTS shares_count INTEGER DEFAULT 0;
ALTER TABLE public.posts ALTER COLUMN content DROP NOT NULL;

CREATE INDEX IF NOT EXISTS idx_posts_quoted_post_id ON public.posts(quoted_post_id);

ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "posts_select_public" ON public.posts;
DROP POLICY IF EXISTS "posts_insert_auth" ON public.posts;
DROP POLICY IF EXISTS "posts_update_auth" ON public.posts;
DROP POLICY IF EXISTS "posts_delete_auth" ON public.posts;

CREATE POLICY "posts_select_public" ON public.posts FOR SELECT USING (is_deleted = false);
CREATE POLICY "posts_insert_auth" ON public.posts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "posts_update_auth" ON public.posts FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "posts_delete_auth" ON public.posts FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- 3. POST_LIKES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.post_likes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, post_id)
);

ALTER TABLE public.post_likes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "post_likes_select_public" ON public.post_likes;
DROP POLICY IF EXISTS "post_likes_insert_auth" ON public.post_likes;
DROP POLICY IF EXISTS "post_likes_delete_auth" ON public.post_likes;

CREATE POLICY "post_likes_select_public" ON public.post_likes FOR SELECT USING (true);
CREATE POLICY "post_likes_insert_auth" ON public.post_likes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "post_likes_delete_auth" ON public.post_likes FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- 4. REPOSTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.reposts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  original_post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, original_post_id)
);

ALTER TABLE public.reposts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "reposts_select_public" ON public.reposts;
DROP POLICY IF EXISTS "reposts_insert_auth" ON public.reposts;
DROP POLICY IF EXISTS "reposts_delete_auth" ON public.reposts;

CREATE POLICY "reposts_select_public" ON public.reposts FOR SELECT USING (true);
CREATE POLICY "reposts_insert_auth" ON public.reposts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "reposts_delete_auth" ON public.reposts FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- 5. FOLLOWS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.follows (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(follower_id, following_id)
);

ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "follows_select_public" ON public.follows;
DROP POLICY IF EXISTS "follows_insert_auth" ON public.follows;
DROP POLICY IF EXISTS "follows_delete_auth" ON public.follows;

CREATE POLICY "follows_select_public" ON public.follows FOR SELECT USING (true);
CREATE POLICY "follows_insert_auth" ON public.follows FOR INSERT WITH CHECK (auth.uid() = follower_id);
CREATE POLICY "follows_delete_auth" ON public.follows FOR DELETE USING (auth.uid() = follower_id);

-- ============================================
-- 6. COMMENTS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  post_id UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  parent_comment_id UUID REFERENCES public.comments(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  is_deleted BOOLEAN DEFAULT false,
  CONSTRAINT content_length CHECK (char_length(content) <= 512)
);

ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "comments_select_public" ON public.comments;
DROP POLICY IF EXISTS "comments_insert_auth" ON public.comments;
DROP POLICY IF EXISTS "comments_update_auth" ON public.comments;
DROP POLICY IF EXISTS "comments_delete_auth" ON public.comments;

CREATE POLICY "comments_select_public" ON public.comments FOR SELECT USING (is_deleted = false);
CREATE POLICY "comments_insert_auth" ON public.comments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "comments_update_auth" ON public.comments FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "comments_delete_auth" ON public.comments FOR DELETE USING (auth.uid() = user_id);

-- ============================================
-- 7. NOTIFICATIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  from_user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE,
  comment_id UUID REFERENCES public.comments(id) ON DELETE CASCADE,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "notifications_select_own" ON public.notifications;
DROP POLICY IF EXISTS "notifications_insert_auth" ON public.notifications;
DROP POLICY IF EXISTS "notifications_update_auth" ON public.notifications;
DROP POLICY IF EXISTS "notifications_delete_own" ON public.notifications;

CREATE POLICY "notifications_select_own" ON public.notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "notifications_insert_auth" ON public.notifications FOR INSERT WITH CHECK (auth.uid() = from_user_id);
CREATE POLICY "notifications_update_auth" ON public.notifications FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "notifications_delete_own" ON public.notifications FOR DELETE USING (auth.uid() = user_id);

-- =========================================================================
-- FUNCTIONS & TRIGGERS
-- =========================================================================

-- FUNC 1: Handle New User Signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, full_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1))
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- FUNC 2: Handle Post Likes (Security Definer to bypass RLS)
CREATE OR REPLACE FUNCTION public.handle_post_like()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.posts SET likes_count = likes_count + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.posts SET likes_count = GREATEST(likes_count - 1, 0) WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS update_likes_count_on_like ON public.post_likes;
CREATE TRIGGER update_likes_count_on_like
  AFTER INSERT OR DELETE ON public.post_likes
  FOR EACH ROW EXECUTE FUNCTION public.handle_post_like();

-- FUNC 3: Handle Comment Counts
CREATE OR REPLACE FUNCTION public.handle_comment_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.posts SET comments_count = comments_count + 1 WHERE id = NEW.post_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.posts SET comments_count = GREATEST(comments_count - 1, 0) WHERE id = OLD.post_id;
  ELSIF TG_OP = 'UPDATE' THEN
    -- Handle soft delete (is_deleted toggle)
    IF OLD.is_deleted = false AND NEW.is_deleted = true THEN
      UPDATE public.posts SET comments_count = GREATEST(comments_count - 1, 0) WHERE id = NEW.post_id;
    ELSIF OLD.is_deleted = true AND NEW.is_deleted = false THEN
      UPDATE public.posts SET comments_count = comments_count + 1 WHERE id = NEW.post_id;
    END IF;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS update_comments_count_on_comment ON public.comments;
CREATE TRIGGER update_comments_count_on_comment
  AFTER INSERT OR DELETE OR UPDATE ON public.comments
  FOR EACH ROW EXECUTE FUNCTION public.handle_comment_count();

-- FUNC 4: Handle Share Counts (Reposts and Quote Posts)
CREATE OR REPLACE FUNCTION public.handle_share_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF TG_TABLE_NAME = 'reposts' THEN
      UPDATE public.posts SET shares_count = shares_count + 1 WHERE id = NEW.original_post_id;
    ELSIF TG_TABLE_NAME = 'posts' AND NEW.quoted_post_id IS NOT NULL THEN
      UPDATE public.posts SET shares_count = shares_count + 1 WHERE id = NEW.quoted_post_id;
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    IF TG_TABLE_NAME = 'reposts' THEN
      UPDATE public.posts SET shares_count = GREATEST(shares_count - 1, 0) WHERE id = OLD.original_post_id;
    ELSIF TG_TABLE_NAME = 'posts' AND OLD.quoted_post_id IS NOT NULL THEN
      UPDATE public.posts SET shares_count = GREATEST(shares_count - 1, 0) WHERE id = OLD.quoted_post_id;
    END IF;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS update_shares_count_on_repost ON public.reposts;
CREATE TRIGGER update_shares_count_on_repost
  AFTER INSERT OR DELETE ON public.reposts
  FOR EACH ROW EXECUTE FUNCTION public.handle_share_count();

DROP TRIGGER IF EXISTS update_shares_count_on_quote ON public.posts;
CREATE TRIGGER update_shares_count_on_quote
  AFTER INSERT OR DELETE ON public.posts
  FOR EACH ROW EXECUTE FUNCTION public.handle_share_count();

-- FUNC 5: Handle Account Deletion (Purge auth.users on profile delete)
CREATE OR REPLACE FUNCTION public.proc_delete_account()
RETURNS TRIGGER AS $$
BEGIN
    DELETE FROM auth.users WHERE id = OLD.id;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_profile_deleted ON public.profiles;
CREATE TRIGGER on_profile_deleted
    AFTER DELETE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.proc_delete_account();

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_posts_user_id ON public.posts(user_id);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON public.posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_post_likes_post_id ON public.post_likes(post_id);
CREATE INDEX IF NOT EXISTS idx_post_likes_user_id ON public.post_likes(user_id);
CREATE INDEX IF NOT EXISTS idx_follows_follower_id ON public.follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_follows_following_id ON public.follows(following_id);
CREATE INDEX IF NOT EXISTS idx_comments_post_id ON public.comments(post_id);
CREATE INDEX IF NOT EXISTS idx_comments_user_id ON public.comments(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reposts_user_id ON public.reposts(user_id);
CREATE INDEX IF NOT EXISTS idx_reposts_post_id ON public.reposts(original_post_id);

-- ============================================
-- STORAGE CONFIGURATION
-- ============================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES ('avatars', 'avatars', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "avatars_select_public" ON storage.objects;
DROP POLICY IF EXISTS "avatars_insert_auth" ON storage.objects;
DROP POLICY IF EXISTS "avatars_update_auth" ON storage.objects;

CREATE POLICY "avatars_select_public" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
CREATE POLICY "avatars_insert_auth" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.role() = 'authenticated');
CREATE POLICY "avatars_update_auth" ON storage.objects FOR UPDATE USING (bucket_id = 'avatars' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Final Sanity Check for content length
ALTER TABLE public.comments DROP CONSTRAINT IF EXISTS content_length;
ALTER TABLE public.comments ADD CONSTRAINT content_length CHECK (char_length(content) <= 512);
-- ============================================
-- DATA INTEGRITY - RECOUNT COMMENTS
-- ============================================
UPDATE public.posts p
SET comments_count = (
  SELECT count(*)
  FROM public.comments c
  WHERE c.post_id = p.id AND c.is_deleted = false
);

-- ============================================
-- DATA INTEGRITY - RECOUNT SHARES/QUOTES
-- ============================================
UPDATE public.posts p
SET shares_count = (
  (SELECT count(*) FROM public.reposts r WHERE r.original_post_id = p.id)
  +
  (SELECT count(*) FROM public.posts q WHERE q.quoted_post_id = p.id AND q.is_deleted = false)
);
