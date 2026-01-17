-- 1. Add is_active for soft deletes (Bug Fix for disappearing data)
ALTER TABLE public.likes ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;
ALTER TABLE public.comments ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;

-- 2. Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_likes_post_active ON public.likes(post_id) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_comments_post_active ON public.comments(post_id) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_likes_user_active ON public.likes(user_id) WHERE is_active = true;

-- 3. RPC to fetch likes with mutual connection status (Feature Enhancement)
CREATE OR REPLACE FUNCTION public.get_post_likes_with_mutuals(p_post_id uuid, p_user_id uuid)
RETURNS TABLE (
  user_id uuid,
  full_name text,
  username text,
  avatar_url text,
  is_you boolean,
  you_follow_them boolean,
  they_follow_you boolean,
  created_at timestamptz
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    p.id as user_id,
    p.full_name,
    p.username,
    p.avatar_url,
    (p.id = p_user_id) as is_you,
    EXISTS(SELECT 1 FROM public.follows f WHERE f.follower_id = p_user_id AND f.following_id = p.id) as you_follow_them,
    EXISTS(SELECT 1 FROM public.follows f WHERE f.follower_id = p.id AND f.following_id = p_user_id) as they_follow_you,
    l.created_at
  FROM public.likes l
  JOIN public.profiles p ON p.id = l.user_id
  WHERE l.post_id = p_post_id 
    AND l.is_active = true
  ORDER BY 
    (p.id = p_user_id) DESC, -- You first
    (EXISTS(SELECT 1 FROM public.follows f WHERE f.follower_id = p_user_id AND f.following_id = p.id)) DESC, -- You follow them next
    l.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Update upvote count trigger to respect is_active
CREATE OR REPLACE FUNCTION public.update_post_upvotes_count()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
      UPDATE public.posts SET upvotes = upvotes + 1 WHERE id = NEW.post_id;
  ELSIF (TG_OP = 'UPDATE') THEN
      -- Handle Soft Delete toggle
      IF (OLD.is_active = true AND NEW.is_active = false) THEN
          UPDATE public.posts SET upvotes = upvotes - 1 WHERE id = NEW.post_id;
      ELSIF (OLD.is_active = false AND NEW.is_active = true) THEN
          UPDATE public.posts SET upvotes = upvotes + 1 WHERE id = NEW.post_id;
      END IF;
  ELSIF (TG_OP = 'DELETE') THEN
      UPDATE public.posts SET upvotes = upvotes - 1 WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_like_change ON public.likes;
CREATE TRIGGER on_like_change
AFTER INSERT OR UPDATE OR DELETE ON public.likes
FOR EACH ROW EXECUTE PROCEDURE public.update_post_upvotes_count();
