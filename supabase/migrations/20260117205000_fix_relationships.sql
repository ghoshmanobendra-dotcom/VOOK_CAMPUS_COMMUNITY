-- Fix relationships to point to public.profiles instead of auth.users
-- This allows PostgREST to join with profiles table to get name/avatar

-- Fix post_comments
ALTER TABLE post_comments DROP CONSTRAINT IF EXISTS post_comments_user_id_fkey;

-- We need to ensure the existing data is valid (if any). 
-- Since tables are new, it should be fine. If profiles don't exist for users, this might fail, 
-- but in this app users always have profiles created on login.

ALTER TABLE post_comments
  ADD CONSTRAINT post_comments_user_id_fkey
  FOREIGN KEY (user_id)
  REFERENCES public.profiles(id)
  ON DELETE CASCADE;

-- Fix post_likes (for consistency, though we mostly count them)
ALTER TABLE post_likes DROP CONSTRAINT IF EXISTS post_likes_user_id_fkey;

ALTER TABLE post_likes
  ADD CONSTRAINT post_likes_user_id_fkey
  FOREIGN KEY (user_id)
  REFERENCES public.profiles(id)
  ON DELETE CASCADE;
