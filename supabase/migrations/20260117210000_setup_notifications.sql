-- Reset Notifications Table to ensure correct schema (fixes missing column errors)
DROP TABLE IF EXISTS notifications CASCADE;

CREATE TABLE notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  sender_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  type text NOT NULL CHECK (type IN ('like', 'comment', 'follow', 'post', 'message', 'announcement', 'mention')),
  entity_type text NOT NULL CHECK (entity_type IN ('post', 'comment', 'message', 'profile', 'community')),
  entity_id uuid, -- Polymorphic reference ID (post_id, comment_id, etc.)
  content text,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notifications" ON notifications
  FOR SELECT USING (auth.uid() = recipient_id);

CREATE POLICY "Users can insert notifications" ON notifications
  FOR INSERT WITH CHECK (auth.uid() = sender_id); 

CREATE POLICY "Users can update their own notifications (read status)" ON notifications
  FOR UPDATE USING (auth.uid() = recipient_id);

-- TRIGGERS for AUTO NOTIFICATIONS --

-- 1. LIKE Notification
CREATE OR REPLACE FUNCTION notify_on_like() RETURNS TRIGGER AS $$
BEGIN
  -- Prevent self-notification
  IF NEW.user_id = (SELECT user_id FROM posts WHERE id = NEW.post_id) THEN
    RETURN NEW;
  END IF;

  INSERT INTO notifications (recipient_id, sender_id, type, entity_type, entity_id, content)
  VALUES (
    (SELECT user_id FROM posts WHERE id = NEW.post_id), -- Recipient (Post Owner)
    NEW.user_id, -- Sender (Liker)
    'like',
    'post',
    NEW.post_id,
    'liked your post'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_post_like ON post_likes;
CREATE TRIGGER on_post_like
  AFTER INSERT ON post_likes
  FOR EACH ROW EXECUTE FUNCTION notify_on_like();

-- 2. COMMENT Notification
CREATE OR REPLACE FUNCTION notify_on_comment() RETURNS TRIGGER AS $$
BEGIN
  -- Prevent self-notification
  IF NEW.user_id = (SELECT user_id FROM posts WHERE id = NEW.post_id) THEN
    RETURN NEW;
  END IF;

  INSERT INTO notifications (recipient_id, sender_id, type, entity_type, entity_id, content)
  VALUES (
    (SELECT user_id FROM posts WHERE id = NEW.post_id), -- Recipient
    NEW.user_id,
    'comment',
    'post',
    NEW.post_id,
    'commented on your post'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_post_comment ON post_comments;
CREATE TRIGGER on_post_comment
  AFTER INSERT ON post_comments
  FOR EACH ROW EXECUTE FUNCTION notify_on_comment();

-- 3. FOLLOW Notification
CREATE OR REPLACE FUNCTION notify_on_follow() RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO notifications (recipient_id, sender_id, type, entity_type, entity_id, content)
  VALUES (
    NEW.following_id,
    NEW.follower_id,
    'follow',
    'profile',
    NEW.following_id, 
    'started following you'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_follow ON follows;
CREATE TRIGGER on_follow
  AFTER INSERT ON follows
  FOR EACH ROW EXECUTE FUNCTION notify_on_follow();
