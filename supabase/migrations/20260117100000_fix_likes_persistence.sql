-- 1. ENABLE EXTENSIONS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. CREATE COMMENTS TABLE
CREATE TABLE IF NOT EXISTS public.comments (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    post_id uuid REFERENCES public.posts(id) ON DELETE CASCADE NOT NULL,
    user_id uuid REFERENCES public.profiles(id) NOT NULL,
    content text NOT NULL,
    parent_id uuid REFERENCES public.comments(id) ON DELETE CASCADE,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

-- Comments indexes for performance
CREATE INDEX IF NOT EXISTS idx_comments_post_id ON public.comments(post_id);
CREATE INDEX IF NOT EXISTS idx_comments_parent_id ON public.comments(parent_id);
CREATE INDEX IF NOT EXISTS idx_comments_user_id ON public.comments(user_id);
CREATE INDEX IF NOT EXISTS idx_comments_created_at ON public.comments(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_comments_active_post ON public.comments(post_id) WHERE is_active = true;

-- Comments policies
DROP POLICY IF EXISTS "Comments are viewable by everyone" ON public.comments;
CREATE POLICY "Comments are viewable by everyone" 
ON public.comments FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can insert comments" ON public.comments;
CREATE POLICY "Users can insert comments" 
ON public.comments FOR INSERT 
WITH CHECK (
  auth.uid() = user_id 
  AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid())
);

DROP POLICY IF EXISTS "Users can update their own comments" ON public.comments;
CREATE POLICY "Users can update their own comments" 
ON public.comments FOR UPDATE 
USING (auth.uid() = user_id) 
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own comments" ON public.comments;
CREATE POLICY "Users can delete their own comments" 
ON public.comments FOR DELETE 
USING (auth.uid() = user_id);


-- 3. CREATE SHARES TABLE
CREATE TABLE IF NOT EXISTS public.shares (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    post_id uuid REFERENCES public.posts(id) ON DELETE CASCADE NOT NULL,
    user_id uuid REFERENCES public.profiles(id) NOT NULL,
    share_type text NOT NULL,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.shares ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can insert shares" ON public.shares;
CREATE POLICY "Users can insert shares" 
ON public.shares FOR INSERT 
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view shares" ON public.shares;
CREATE POLICY "Users can view shares" 
ON public.shares FOR SELECT 
USING (auth.uid() = user_id);


-- 4. CREATE NOTIFICATIONS SYSTEM
CREATE TABLE IF NOT EXISTS public.notifications (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    recipient_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    actor_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
    type text NOT NULL, 
    entity_type text NOT NULL, 
    entity_id uuid NOT NULL, 
    data jsonb DEFAULT '{}'::jsonb, 
    is_read boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
CREATE POLICY "Users can view their own notifications" 
ON public.notifications FOR SELECT 
USING (auth.uid() = recipient_id);

DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notifications;
CREATE POLICY "Users can update their own notifications" 
ON public.notifications FOR UPDATE 
USING (auth.uid() = recipient_id);

-- Notifications indexes
CREATE INDEX IF NOT EXISTS idx_notifications_recipient_id ON public.notifications(recipient_id);
CREATE INDEX IF NOT EXISTS idx_notifications_recipient_unread ON public.notifications(recipient_id) WHERE is_read = false;
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);


-- 5. UPDATE LIKES TABLE FOR SOFT DELETES (Fix Disappearing Likes)
ALTER TABLE public.likes ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;
CREATE INDEX IF NOT EXISTS idx_likes_post_active ON public.likes(post_id) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_likes_user_post ON public.likes(user_id, post_id);


-- 6. FIX UPVOTES INTEGRITY
UPDATE public.posts SET upvotes = 0 WHERE upvotes IS NULL;
ALTER TABLE public.posts ALTER COLUMN upvotes SET DEFAULT 0;


-- 7. ENSURE COMMENTS_COUNT COLUMN EXISTS
ALTER TABLE public.posts 
ADD COLUMN IF NOT EXISTS comments_count integer DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_posts_comments_count ON public.posts(comments_count DESC);


-- 8. MUTUAL LIKES FUNCTION (RPC)
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
    (p.id = p_user_id) DESC,
    (EXISTS(SELECT 1 FROM public.follows f WHERE f.follower_id = p_user_id AND f.following_id = p.id)) DESC,
    l.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 9. AUTO-NOTIFICATION TRIGGER
CREATE OR REPLACE FUNCTION public.handle_new_notification()
RETURNS TRIGGER AS $$
DECLARE
    recipient uuid;
    notif_type text;
    ent_type text;
    ent_id uuid;
    meta_data jsonb;
BEGIN
    IF (TG_TABLE_NAME = 'likes') THEN
        IF (NEW.is_active = false) THEN RETURN NULL; END IF; -- Ignore soft deletes
        SELECT user_id INTO recipient FROM public.posts WHERE id = NEW.post_id;
        notif_type := 'like';
        ent_type := 'post';
        ent_id := NEW.post_id;
        meta_data := '{}'::jsonb;
    ELSIF (TG_TABLE_NAME = 'comments') THEN
        IF (NEW.parent_id IS NOT NULL) THEN
            SELECT user_id INTO recipient FROM public.comments WHERE id = NEW.parent_id;
            notif_type := 'reply';
            ent_type := 'comment';
            ent_id := NEW.id; -- Use comment ID for replies
        ELSE
            SELECT user_id INTO recipient FROM public.posts WHERE id = NEW.post_id;
            notif_type := 'comment';
            ent_type := 'post';
            ent_id := NEW.post_id;
        END IF;
        meta_data := jsonb_build_object('snippet', substring(NEW.content from 1 for 50));
    ELSIF (TG_TABLE_NAME = 'follows') THEN
        recipient := NEW.following_id;
        notif_type := 'follow';
        ent_type := 'profile';
        ent_id := NEW.follower_id;
        meta_data := '{}'::jsonb;
    END IF;

    IF (recipient IS NOT NULL AND recipient != NEW.user_id) THEN -- Don't notify self
        INSERT INTO public.notifications (recipient_id, actor_id, type, entity_type, entity_id, data)
        VALUES (recipient, NEW.user_id, notif_type, ent_type, ent_id, meta_data);
    END IF;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 10. COMMENT COUNT TRIGGER
CREATE OR REPLACE FUNCTION public.update_post_comments_count()
RETURNS TRIGGER AS $$
BEGIN
    IF (TG_OP = 'INSERT') THEN
        UPDATE public.posts SET comments_count = comments_count + 1 WHERE id = NEW.post_id;
    ELSIF (TG_OP = 'DELETE') THEN
        UPDATE public.posts SET comments_count = comments_count - 1 WHERE id = OLD.post_id;
    ELSIF (TG_OP = 'UPDATE' AND OLD.is_active != NEW.is_active) THEN
        -- Handle soft deletes/reactivations
        IF (NEW.is_active = false AND OLD.is_active = true) THEN
            UPDATE public.posts SET comments_count = comments_count - 1 WHERE id = NEW.post_id;
        ELSIF (NEW.is_active = true AND OLD.is_active = false) THEN
            UPDATE public.posts SET comments_count = comments_count + 1 WHERE id = NEW.post_id;
        END IF;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 11. APPLY TRIGGERS
DROP TRIGGER IF EXISTS on_like_created ON public.likes;
CREATE TRIGGER on_like_created 
AFTER INSERT ON public.likes 
FOR EACH ROW EXECUTE PROCEDURE public.handle_new_notification();

DROP TRIGGER IF EXISTS on_comment_created ON public.comments;
CREATE TRIGGER on_comment_created 
AFTER INSERT ON public.comments 
FOR EACH ROW EXECUTE PROCEDURE public.handle_new_notification();

DROP TRIGGER IF EXISTS on_follow_created ON public.follows;
CREATE TRIGGER on_follow_created 
AFTER INSERT ON public.follows 
FOR EACH ROW EXECUTE PROCEDURE public.handle_new_notification();

DROP TRIGGER IF EXISTS on_comment_change ON public.comments;
CREATE TRIGGER on_comment_change 
AFTER INSERT OR DELETE OR UPDATE ON public.comments 
FOR EACH ROW EXECUTE PROCEDURE public.update_post_comments_count();


-- 12. GRANT PERMISSIONS FOR AUTH SCHEMA
GRANT USAGE ON SCHEMA auth TO authenticated, anon;