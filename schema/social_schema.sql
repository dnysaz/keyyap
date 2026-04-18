-- =========================================================================
-- KeyYap.com - SOCIAL AUTH & AUTOMATED PROFILES SCHEMA
-- =========================================================================
-- This script handles automated profile creation when a user signs up 
-- via Google or Email. It generates a unique, compact username.
-- =========================================================================

-- 1. FUNCTION: handle_new_user
-- Generates a username: 5 chars from email + "_" + 3 random chars
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
DECLARE
  base_username TEXT;
  final_username TEXT;
BEGIN
  -- Extract up to 5 chars from email prefix, force lowercase
  base_username := lower(substring(split_part(new.email, '@', 1) from 1 for 5));
  
  -- Append underscore and 3 random hex characters
  final_username := base_username || '_' || substr(md5(random()::text), 1, 3);

  -- Insert into public.profiles
  -- Using ON CONFLICT to prevent errors if by any chance the UID exists
  INSERT INTO public.profiles (id, username, full_name, avatar_url)
  VALUES (
    new.id,
    final_username,
    COALESCE(new.raw_user_meta_data->>'full_name', base_username),
    new.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 2. TRIGGER: on_auth_user_created
-- Fires automatically whenever a record is added to auth.users
DROP TRIGGER IF EXISTS tr_on_auth_user_created ON auth.users;
CREATE TRIGGER tr_on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- =========================================================================
-- NOTE: 
-- 1. Ensure 'profiles' table exists before running this.
-- 2. This handles both Email Signup and Google OAuth.
-- =========================================================================
