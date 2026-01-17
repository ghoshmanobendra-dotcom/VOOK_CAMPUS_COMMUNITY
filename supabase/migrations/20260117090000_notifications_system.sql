-- 1. Notifications Table
CREATE TABLE IF NOT EXISTS public.notifications (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    recipient_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    actor_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
    type text NOT NULL, -- 'like', 'comment', 'reply', 'follow', 'community_invite', 'announcement'
    entity_type text NOT NULL, -- 'post', 'comment', 'profile', 'community'
    entity_id uuid NOT NULL, -- post_id, comment_id, etc.
    data jsonb DEFAULT '{}'::jsonb, -- Store snippet, toggle state, etc.
    is_read boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
CREATE POLICY "Users can view their own notifications" 
ON public.notifications FOR SELECT USING (auth.uid() = recipient_id);

DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notifications;
CREATE POLICY "Users can update their own notifications" 
ON public.notifications FOR UPDATE USING (auth.uid() = recipient_id);

-- 2. Notification Preferences
CREATE TABLE IF NOT EXISTS public.notification_preferences (
    user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE PRIMARY KEY,
    likes boolean DEFAULT true,
    comments boolean DEFAULT true,
    new_followers boolean DEFAULT true,
    community_updates boolean DEFAULT true,
    mentions boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.notification_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their preferences" ON public.notification_preferences;
CREATE POLICY "Users can view their preferences" 
ON public.notification_preferences FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their preferences" ON public.notification_preferences;
CREATE POLICY "Users can update their preferences" 
ON public.notification_preferences FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their preferences" ON public.notification_preferences;
CREATE POLICY "Users can insert their preferences" 
ON public.notification_preferences FOR INSERT WITH CHECK (auth.uid() = user_id);


-- 3. Triggers for Automatic Notifications

-- Function to create notification
CREATE OR REPLACE FUNCTION public.handle_new_notification()
RETURNS TRIGGER AS $$
DECLARE
    recipient uuid;
    actor uuid;
    notif_type text;
    ent_type text;
    ent_id uuid;
    meta_data jsonb;
    should_notify boolean := true;
BEGIN
    actor := NEW.user_id; -- Most tables have user_id as the actor

    -- LIKE Notification
    IF (TG_TABLE_NAME = 'likes') THEN
        SELECT user_id INTO recipient FROM public.posts WHERE id = NEW.post_id;
        IF (recipient = actor) THEN RETURN NULL; END IF; -- Don't notify self
        
        notif_type := 'like';
        ent_type := 'post';
        ent_id := NEW.post_id;
        meta_data := '{}'::jsonb;

    -- COMMENT Notification
    ELSIF (TG_TABLE_NAME = 'comments') THEN
        -- If reply
        IF (NEW.parent_id IS NOT NULL) THEN
            SELECT user_id INTO recipient FROM public.comments WHERE id = NEW.parent_id;
            notif_type := 'reply';
            ent_type := 'comment'; -- Entity is the parent comment usually, or the post? Let's point to post for navigation
            ent_id := NEW.post_id; 
            meta_data := jsonb_build_object('comment_id', NEW.id, 'snippet', substring(NEW.content from 1 for 50));
        ELSE
            SELECT user_id INTO recipient FROM public.posts WHERE id = NEW.post_id;
            notif_type := 'comment';
            ent_type := 'post';
            ent_id := NEW.post_id;
            meta_data := jsonb_build_object('comment_id', NEW.id, 'snippet', substring(NEW.content from 1 for 50));
        END IF;

        IF (recipient = actor) THEN RETURN NULL; END IF;

    -- FOLLOW Notification
    ELSIF (TG_TABLE_NAME = 'follows') THEN
        actor := NEW.follower_id;
        recipient := NEW.following_id;
        notif_type := 'follow';
        ent_type := 'profile';
        ent_id := NEW.follower_id; -- Link to the follower's profile
        meta_data := '{}'::jsonb;
    END IF;

    -- Insert Notification
    IF (recipient IS NOT NULL) THEN
        INSERT INTO public.notifications (recipient_id, actor_id, type, entity_type, entity_id, data)
        VALUES (recipient, actor, notif_type, ent_type, ent_id, meta_data);
    END IF;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Triggers
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

-- Mark all read RPC
CREATE OR REPLACE FUNCTION public.mark_all_notifications_read()
RETURNS void AS $$
BEGIN
    UPDATE public.notifications
    SET is_read = true
    WHERE recipient_id = auth.uid() AND is_read = false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
