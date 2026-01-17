-- FIX: Drop and Recreate Notifications table to ensure correct schema
-- The previous error "column actor_id does not exist" suggests an old version of the table exists.

DROP TRIGGER IF EXISTS on_like_created ON public.likes;
DROP TRIGGER IF EXISTS on_comment_created ON public.comments;
DROP TRIGGER IF EXISTS on_follow_created ON public.follows;

DROP FUNCTION IF EXISTS public.handle_new_notification();

-- Drop table to clear any bad schema
DROP TABLE IF EXISTS public.notifications;

-- Recreate Table with ALL columns
CREATE TABLE public.notifications (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    recipient_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    actor_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE, -- This was missing
    type text NOT NULL, 
    entity_type text NOT NULL, 
    entity_id uuid NOT NULL, 
    data jsonb DEFAULT '{}'::jsonb, 
    is_read boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Re-enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notifications" ON public.notifications FOR SELECT USING (auth.uid() = recipient_id);
CREATE POLICY "Users can update their own notifications" ON public.notifications FOR UPDATE USING (auth.uid() = recipient_id);

-- Re-create Trigger Function
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
        IF (NEW.is_active = false) THEN RETURN NULL; END IF;
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
            ent_id := NEW.post_id; 
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

    -- Insert with actor_id
    IF (recipient IS NOT NULL AND recipient != NEW.user_id) THEN 
        INSERT INTO public.notifications (recipient_id, actor_id, type, entity_type, entity_id, data)
        VALUES (recipient, NEW.user_id, notif_type, ent_type, ent_id, meta_data);
    END IF;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Re-Apply Triggers
CREATE TRIGGER on_like_created AFTER INSERT ON public.likes FOR EACH ROW EXECUTE PROCEDURE public.handle_new_notification();
CREATE TRIGGER on_comment_created AFTER INSERT ON public.comments FOR EACH ROW EXECUTE PROCEDURE public.handle_new_notification();
CREATE TRIGGER on_follow_created AFTER INSERT ON public.follows FOR EACH ROW EXECUTE PROCEDURE public.handle_new_notification();
