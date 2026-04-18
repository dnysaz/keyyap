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
  cover_url TEXT,
  bio TEXT,
  website TEXT,
  is_private BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  hide_from_global BOOLEAN DEFAULT false,
  hide_from_search BOOLEAN DEFAULT false,
  CONSTRAINT username_length CHECK (char_length(username) >= 3)
);

-- Ensure cover_url exists (in case table was already created)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS cover_url TEXT;

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
  quoted_post_id UUID REFERENCES public.posts(id) ON DELETE SET NULL,
  location_name TEXT,
  location_lat DOUBLE PRECISION,
  location_lng DOUBLE PRECISION
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

-- ============================================
-- 8. SITE_SETTINGS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS public.site_settings (
  key TEXT PRIMARY KEY,
  value TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

INSERT INTO public.site_settings (key, value) VALUES
('site_title', 'KeyYap! - The Good Place For Yapping!'),
('site_description', 'Express yourself freely on KeyYap!, the ultimate social space for text-based sharing and meaningful conversations.'),
('site_og_image', 'https://raw.githubusercontent.com/dnysaz/keyyap-image/60b91a4783745207f6de32c73a2aa5b41ae1dc77/keyyap!%20(1).png'),
('terms_of_service', 'Welcome to KeyYap. By using our services...'),
('privacy_policy', 'We value your privacy...'),
('cookie_policy', 'We use cookies...')
ON CONFLICT (key) DO NOTHING;

ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow public read" ON public.site_settings;
DROP POLICY IF EXISTS "Allow admin update" ON public.site_settings;
CREATE POLICY "Allow public read" ON public.site_settings FOR SELECT USING (true);
CREATE POLICY "Allow admin update" ON public.site_settings FOR ALL USING (auth.role() = 'authenticated');
ALTER TABLE public.site_settings REPLICA IDENTITY FULL;

-- =========================================================================
-- FUNCTIONS & TRIGGERS
-- =========================================================================

-- FUNC 1: Handle New User Signup (ADVANCED: Auto-username + Auto-follow)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  base_username TEXT;
  final_username TEXT;
  keyyap_id UUID := '140e6089-cc79-4d6d-b80c-c46644fcfc45'; -- Official @keyyap ID
BEGIN
  -- 1. GENERATE USERNAME
  base_username := lower(substring(split_part(new.email, '@', 1) from 1 for 5));
  final_username := base_username || '_' || substr(md5(random()::text), 1, 3);

  -- 2. CREATE PROFILE
  INSERT INTO public.profiles (id, username, full_name, avatar_url)
  VALUES (
    new.id,
    final_username,
    COALESCE(new.raw_user_meta_data->>'full_name', final_username),
    new.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;

  -- 3. AUTO-FOLLOW OFFICIAL ACCOUNT
  -- This ensures the new user's home feed is not empty
  INSERT INTO public.follows (follower_id, following_id)
  VALUES (new.id, keyyap_id)
  ON CONFLICT DO NOTHING;

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- COUNTER HANDLERS
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

DROP TRIGGER IF EXISTS tr_update_likes ON public.post_likes;
CREATE TRIGGER tr_update_likes AFTER INSERT OR DELETE ON public.post_likes FOR EACH ROW EXECUTE FUNCTION public.handle_counters();

DROP TRIGGER IF EXISTS tr_update_comments ON public.comments;
CREATE TRIGGER tr_update_comments AFTER INSERT OR DELETE ON public.comments FOR EACH ROW EXECUTE FUNCTION public.handle_counters();

DROP TRIGGER IF EXISTS tr_update_reposts ON public.reposts;
CREATE TRIGGER tr_update_reposts AFTER INSERT OR DELETE ON public.reposts FOR EACH ROW EXECUTE FUNCTION public.handle_counters();

-- NOTIFICATIONS HANDLER
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

-- REALTIME CONFIGURATION
DROP PUBLICATION IF EXISTS supabase_realtime;
CREATE PUBLICATION supabase_realtime FOR TABLE 
  public.posts, 
  public.comments, 
  public.notifications, 
  public.profiles, 
  public.post_likes,
  public.site_settings;

ALTER TABLE public.posts REPLICA IDENTITY FULL;
ALTER TABLE public.comments REPLICA IDENTITY FULL;
ALTER TABLE public.notifications REPLICA IDENTITY FULL;
ALTER TABLE public.profiles REPLICA IDENTITY FULL;

-- STORAGE CONFIGURATION
INSERT INTO storage.buckets (id, name, public) VALUES ('avatars', 'avatars', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('covers', 'covers', true) ON CONFLICT (id) DO NOTHING;
DROP POLICY IF EXISTS "avatars_select_public" ON storage.objects;
DROP POLICY IF EXISTS "avatars_insert_auth" ON storage.objects;
DROP POLICY IF EXISTS "covers_select_public" ON storage.objects;
DROP POLICY IF EXISTS "covers_insert_auth" ON storage.objects;
CREATE POLICY "avatars_select_public" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
CREATE POLICY "avatars_insert_auth" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.role() = 'authenticated');
CREATE POLICY "covers_select_public" ON storage.objects FOR SELECT USING (bucket_id = 'covers');
CREATE POLICY "covers_insert_auth" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'covers' AND auth.role() = 'authenticated');

-- RELOAD SCHEMA CACHE
NOTIFY pgrst, 'reload schema';
