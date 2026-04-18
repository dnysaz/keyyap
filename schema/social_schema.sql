-- =========================================================================
-- KeyYap.com - SOCIAL AUTH & AUTO-FOLLOW SCHEMA v2
-- =========================================================================
-- This script handles automated profile creation and AUTO-FOLLOWS 
-- the official @keyyap account for every new user.
-- =========================================================================

-- 1. FUNCTION: handle_new_user
-- Generates username AND auto-follows @keyyap
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  base_username TEXT;
  final_username TEXT;
  keyyap_id UUID;
BEGIN
  -- 1. Generate Username: Extract up to 5 chars from email prefix, force lowercase
  base_username := lower(substring(split_part(new.email, '@', 1) from 1 for 5));
  final_username := base_username || '_' || substr(md5(random()::text), 1, 3);

  -- 2. Create the profile
  INSERT INTO public.profiles (id, username, full_name, avatar_url)
  VALUES (
    new.id,
    final_username,
    COALESCE(new.raw_user_meta_data->>'full_name', base_username),
    new.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;

  -- 3. AUTO-FOLLOW official @keyyap account
  -- Find the UUID of @keyyap
  SELECT id INTO keyyap_id FROM public.profiles WHERE username = 'keyyap' LIMIT 1;
  
  -- If official account found and it's not the user themselves
  IF keyyap_id IS NOT NULL AND keyyap_id != new.id THEN
    INSERT INTO public.follows (follower_id, following_id)
    VALUES (new.id, keyyap_id)
    ON CONFLICT DO NOTHING;
  END IF;

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 2. TRIGGER: on_auth_user_created
DROP TRIGGER IF EXISTS tr_on_auth_user_created ON auth.users;
CREATE TRIGGER tr_on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =========================================================================
-- NOTE:
-- After running this, new users will automatically follow @keyyap.
-- =========================================================================
