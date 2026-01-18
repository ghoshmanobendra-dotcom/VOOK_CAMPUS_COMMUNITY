-- Comprehensive fix for Notifications System matching the Master Prompt

-- 1. Ensure Table Schema matches requirements
ALTER TABLE notifications 
ADD COLUMN IF NOT EXISTS receiver_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS actor_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS data jsonb DEFAULT '{}'::jsonb;

-- 2. Backfill columns if they were empty (Transition from old schema)
UPDATE notifications SET receiver_id = recipient_id WHERE receiver_id IS NULL AND recipient_id IS NOT NULL;
UPDATE notifications SET actor_id = sender_id WHERE actor_id IS NULL AND sender_id IS NOT NULL;

-- 3. RLS Policies (As requested)
DROP POLICY IF EXISTS "read_own_notifications" ON notifications;
DROP POLICY IF EXISTS "insert_notification" ON notifications;
-- Remove old policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view their own notifications" ON notifications;
DROP POLICY IF EXISTS "Users can insert notifications" ON notifications;
DROP POLICY IF EXISTS "Users can update their own notifications (read status)" ON notifications;

CREATE POLICY "read_own_notifications"
ON notifications
FOR SELECT
USING (receiver_id = auth.uid());

CREATE POLICY "insert_notification"
ON notifications
FOR INSERT
WITH CHECK (actor_id = auth.uid());

CREATE POLICY "update_own_notifications"
ON notifications
FOR UPDATE
USING (receiver_id = auth.uid());

-- 4. Triggers (Updating to use new columns)

-- LIKE Notification
CREATE OR REPLACE FUNCTION notify_on_like() RETURNS TRIGGER AS $$
BEGIN
  -- Prevent self-notification
  IF NEW.user_id = (SELECT user_id FROM posts WHERE id = NEW.post_id) THEN
    RETURN NEW;
  END IF;

  INSERT INTO notifications (receiver_id, actor_id, type, entity_type, entity_id, data)
  VALUES (
    (SELECT user_id FROM posts WHERE id = NEW.post_id), -- Receiver
    NEW.user_id, -- Actor
    'like',
    'post',
    NEW.post_id,
    jsonb_build_object('post_id', NEW.post_id)
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- COMMENT Notification
CREATE OR REPLACE FUNCTION notify_on_comment() RETURNS TRIGGER AS $$
BEGIN
  -- Prevent self-notification
  IF NEW.user_id = (SELECT user_id FROM posts WHERE id = NEW.post_id) THEN
    RETURN NEW;
  END IF;

  INSERT INTO notifications (receiver_id, actor_id, type, entity_type, entity_id, data)
  VALUES (
    (SELECT user_id FROM posts WHERE id = NEW.post_id), -- Receiver
    NEW.user_id, -- Actor
    'comment',
    'post',
    NEW.post_id,
    jsonb_build_object('comment_content', substring(NEW.content from 1 for 50))
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- FOLLOW Notification
CREATE OR REPLACE FUNCTION notify_on_follow() RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO notifications (receiver_id, actor_id, type, entity_type, entity_id, data)
  VALUES (
    NEW.following_id, -- Receiver
    NEW.follower_id, -- Actor
    'follow',
    'profile',
    NEW.following_id, 
    '{}'::jsonb
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Re-apply triggers (just in case)
DROP TRIGGER IF EXISTS on_post_like ON post_likes;
CREATE TRIGGER on_post_like AFTER INSERT ON post_likes FOR EACH ROW EXECUTE FUNCTION notify_on_like();

DROP TRIGGER IF EXISTS on_post_comment ON post_comments;
CREATE TRIGGER on_post_comment AFTER INSERT ON post_comments FOR EACH ROW EXECUTE FUNCTION notify_on_comment();

DROP TRIGGER IF EXISTS on_follow ON follows;
CREATE TRIGGER on_follow AFTER INSERT ON follows FOR EACH ROW EXECUTE FUNCTION notify_on_follow();
