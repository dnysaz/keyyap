-- =========================================================================
-- KeyYap.com - COMPLETE CONSOLIDATED BACKEND SCHEMA (v3.1 MAXIMIZED)
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
  hide_from_global BOOLEAN DEFAULT false,
  hide_from_search BOOLEAN DEFAULT false,
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
  content TEXT,
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

ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "posts_select_public" ON public.posts;
DROP POLICY IF EXISTS "posts_insert_auth" ON public.posts;
DROP POLICY IF EXISTS "posts_update_auth" ON public.posts;
DROP POLICY IF EXISTS "posts_delete_auth" ON public.posts;

CREATE POLICY "posts_select_public" ON public.posts FOR SELECT USING (is_deleted = false OR auth.uid() = user_id);
CREATE POLICY "posts_insert_auth" ON public.posts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "posts_update_auth" ON public.posts FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
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
  deleted_at TIMESTAMPTZ
);

ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "comments_select_public" ON public.comments;
DROP POLICY IF EXISTS "comments_insert_auth" ON public.comments;
DROP POLICY IF EXISTS "comments_update_auth" ON public.comments;
DROP POLICY IF EXISTS "comments_delete_auth" ON public.comments;

CREATE POLICY "comments_select_public" ON public.comments FOR SELECT USING (true);
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
CREATE POLICY "notifications_insert_auth" ON public.notifications FOR INSERT WITH CHECK (true);
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
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- CLEANUP: Menghapus semua kemungkinan trigger ganda yang pernah dibuat sebelumnya
-- Untuk Komentar
DROP TRIGGER IF EXISTS tr_update_comments ON public.comments;
DROP TRIGGER IF EXISTS on_comment_inserted ON public.comments;
DROP TRIGGER IF EXISTS update_comment_counter ON public.comments;
DROP TRIGGER IF EXISTS update_comments_count_on_comment ON public.comments;

-- Untuk Like
DROP TRIGGER IF EXISTS tr_update_likes ON public.post_likes;
DROP TRIGGER IF EXISTS on_like_inserted ON public.post_likes;
DROP TRIGGER IF EXISTS update_like_counter ON public.post_likes;
DROP TRIGGER IF EXISTS update_likes_count_on_like ON public.post_likes;

-- Untuk Repost / Shares
DROP TRIGGER IF EXISTS tr_update_reposts ON public.reposts;
DROP TRIGGER IF EXISTS on_repost_inserted ON public.reposts;
DROP TRIGGER IF EXISTS update_repost_counter ON public.reposts;
DROP TRIGGER IF EXISTS update_shares_count_on_repost_insert ON public.reposts;
DROP TRIGGER IF EXISTS update_shares_count_on_quote_insert ON public.posts; -- Hapus trigger pengganggu di tabel posts
DROP TRIGGER IF EXISTS update_shares_count_on_quo... ON public.posts; -- Hapus kemungkinan nama terpotong di UI

-- FUNC 2: Handle Counter Updates (Likes, Comments, Shares)
-- Dioptimalkan agar lebih kuat dan tidak double
CREATE OR REPLACE FUNCTION public.handle_counters()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_TABLE_NAME = 'post_likes' THEN
    IF TG_OP = 'INSERT' THEN
      UPDATE public.posts SET likes_count = likes_count + 1 WHERE id = NEW.post_id;
    ELSIF TG_OP = 'DELETE' THEN
      UPDATE public.posts SET likes_count = GREATEST(likes_count - 1, 0) WHERE id = OLD.post_id;
    END IF;
  ELSIF TG_TABLE_NAME = 'comments' THEN
    IF TG_OP = 'INSERT' THEN
      UPDATE public.posts SET comments_count = (SELECT count(*) FROM public.comments WHERE post_id = NEW.post_id AND is_deleted = false) WHERE id = NEW.post_id;
    ELSIF TG_OP = 'DELETE' THEN
      UPDATE public.posts SET comments_count = (SELECT count(*) FROM public.comments WHERE post_id = OLD.post_id AND is_deleted = false) WHERE id = OLD.post_id;
    END IF;
  ELSIF TG_TABLE_NAME = 'reposts' THEN
    IF TG_OP = 'INSERT' THEN
      UPDATE public.posts SET shares_count = shares_count + 1 WHERE id = NEW.original_post_id;
    ELSIF TG_OP = 'DELETE' THEN
      UPDATE public.posts SET shares_count = GREATEST(shares_count - 1, 0) WHERE id = OLD.original_post_id;
    END IF;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Pasang kembali trigger tunggal yang benar
DROP TRIGGER IF EXISTS tr_update_likes ON public.post_likes;
CREATE TRIGGER tr_update_likes AFTER INSERT OR DELETE ON public.post_likes FOR EACH ROW EXECUTE FUNCTION public.handle_counters();

DROP TRIGGER IF EXISTS tr_update_comments ON public.comments;
CREATE TRIGGER tr_update_comments AFTER INSERT OR DELETE ON public.comments FOR EACH ROW EXECUTE FUNCTION public.handle_counters();

DROP TRIGGER IF EXISTS tr_update_reposts ON public.reposts;
CREATE TRIGGER tr_update_reposts AFTER INSERT OR DELETE ON public.reposts FOR EACH ROW EXECUTE FUNCTION public.handle_counters();

-- FUNC 3: AUTOMATED NOTIFICATIONS
CREATE OR REPLACE FUNCTION public.handler_create_notification()
RETURNS TRIGGER AS $$
DECLARE
  target_user_id UUID;
BEGIN
  IF TG_TABLE_NAME = 'post_likes' THEN
    SELECT user_id INTO target_user_id FROM public.posts WHERE id = NEW.post_id;
    IF target_user_id != NEW.user_id THEN
      INSERT INTO public.notifications (user_id, type, from_user_id, post_id)
      VALUES (target_user_id, 'like', NEW.user_id, NEW.post_id) ON CONFLICT DO NOTHING;
    END IF;
  ELSIF TG_TABLE_NAME = 'follows' THEN
    IF NEW.following_id != NEW.follower_id THEN
      INSERT INTO public.notifications (user_id, type, from_user_id)
      VALUES (NEW.following_id, 'follow', NEW.follower_id) ON CONFLICT DO NOTHING;
    END IF;
  ELSIF TG_TABLE_NAME = 'reposts' THEN
    SELECT user_id INTO target_user_id FROM public.posts WHERE id = NEW.original_post_id;
    IF target_user_id != NEW.user_id THEN
      INSERT INTO public.notifications (user_id, type, from_user_id, post_id)
      VALUES (target_user_id, 'repost', NEW.user_id, NEW.original_post_id) ON CONFLICT DO NOTHING;
    END IF;
  ELSIF TG_TABLE_NAME = 'comments' THEN
    SELECT user_id INTO target_user_id FROM public.posts WHERE id = NEW.post_id;
    IF target_user_id != NEW.user_id THEN
      INSERT INTO public.notifications (user_id, type, from_user_id, post_id, comment_id)
      VALUES (target_user_id, 'comment', NEW.user_id, NEW.post_id, NEW.id) ON CONFLICT DO NOTHING;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS tr_notify_like ON public.post_likes;
CREATE TRIGGER tr_notify_like AFTER INSERT ON public.post_likes FOR EACH ROW EXECUTE FUNCTION handler_create_notification();

DROP TRIGGER IF EXISTS tr_notify_follow ON public.follows;
CREATE TRIGGER tr_notify_follow AFTER INSERT ON public.follows FOR EACH ROW EXECUTE FUNCTION handler_create_notification();

DROP TRIGGER IF EXISTS tr_notify_repost ON public.reposts;
CREATE TRIGGER tr_notify_repost AFTER INSERT ON public.reposts FOR EACH ROW EXECUTE FUNCTION handler_create_notification();

DROP TRIGGER IF EXISTS tr_notify_comment ON public.comments;
CREATE TRIGGER tr_notify_comment AFTER INSERT ON public.comments FOR EACH ROW EXECUTE FUNCTION handler_create_notification();

-- FUNC 4: HANDLE MENTIONS (Auto-detect @username)
CREATE OR REPLACE FUNCTION public.handle_mentions()
RETURNS TRIGGER AS $$
DECLARE
  mention_record RECORD;
  mentioned_user_id UUID;
BEGIN
  -- Regex to find @username (looking for @ followed by word characters)
  -- Matches are returned as a set of rows
  FOR mention_record IN 
    SELECT DISTINCT unnest(regexp_matches(NEW.content, '(?<!\w)@(\w+)', 'g')) as username
  LOOP
    -- Find the user_id for this username (case insensitive)
    SELECT id INTO mentioned_user_id FROM public.profiles 
    WHERE lower(username) = lower(mention_record.username);
    
    -- Insert notification if user exists and is not the sender
    IF mentioned_user_id IS NOT NULL AND mentioned_user_id != NEW.user_id THEN
      INSERT INTO public.notifications (user_id, type, from_user_id, post_id, comment_id)
      VALUES (
        mentioned_user_id, 
        CASE WHEN TG_TABLE_NAME = 'posts' THEN 'mention_post' ELSE 'mention_comment' END, 
        NEW.user_id, 
        CASE WHEN TG_TABLE_NAME = 'posts' THEN NEW.id ELSE NEW.post_id END,
        CASE WHEN TG_TABLE_NAME = 'comments' THEN NEW.id ELSE NULL END
      ) ON CONFLICT DO NOTHING;
    END IF;
  END LOOP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS tr_process_post_mentions ON public.posts;
CREATE TRIGGER tr_process_post_mentions AFTER INSERT ON public.posts FOR EACH ROW EXECUTE FUNCTION handle_mentions();

DROP TRIGGER IF EXISTS tr_process_comment_mentions ON public.comments;
CREATE TRIGGER tr_process_comment_mentions AFTER INSERT ON public.comments FOR EACH ROW EXECUTE FUNCTION handle_mentions();

-- =========================================================================
-- REALTIME CONFIGURATION
-- =========================================================================
-- Cleanest way to refresh: Drop existing and recreate for all tables
DROP PUBLICATION IF EXISTS supabase_realtime;

CREATE PUBLICATION supabase_realtime FOR TABLE 
  public.posts, 
  public.comments, 
  public.notifications, 
  public.profiles, 
  public.post_likes;

ALTER TABLE public.posts REPLICA IDENTITY FULL;
ALTER TABLE public.comments REPLICA IDENTITY FULL;
ALTER TABLE public.notifications REPLICA IDENTITY FULL;
ALTER TABLE public.profiles REPLICA IDENTITY FULL;

-- ============================================
-- STORAGE CONFIGURATION
-- ============================================
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true) ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "avatars_select_public" ON storage.objects;
DROP POLICY IF EXISTS "avatars_insert_auth" ON storage.objects;

CREATE POLICY "avatars_select_public" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
CREATE POLICY "avatars_insert_auth" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.role() = 'authenticated');

-- =========================================================================
-- PATCH v3.2 — Copy everything below this line into Supabase SQL Editor
-- =========================================================================

-- FIX 1: Allow database triggers to insert notifications
-- The old policy (auth.uid() = from_user_id) blocked triggers from creating
-- notifications because triggers run in a server context where auth.uid()
-- may not match. SELECT/UPDATE/DELETE remain locked to user_id.
DROP POLICY IF EXISTS "notifications_insert_auth" ON public.notifications;
CREATE POLICY "notifications_insert_auth" ON public.notifications FOR INSERT WITH CHECK (true);

-- FIX 2: Sync all comment counts (one-time repair for stale counters)
UPDATE public.posts p
SET comments_count = (
  SELECT count(*) FROM public.comments c 
  WHERE c.post_id = p.id AND c.is_deleted = false
);

-- =========================================================================
-- PATCH v3.3 — Edit/Delete Comment Feature
-- =========================================================================

-- Add deleted_at column to comments
ALTER TABLE public.comments ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- Allow viewing deleted comments (they render as placeholders in UI)
DROP POLICY IF EXISTS "comments_select_public" ON public.comments;
CREATE POLICY "comments_select_public" ON public.comments FOR SELECT USING (true);
