-- Add actor_id column to notifications table
ALTER TABLE notifications 
ADD COLUMN IF NOT EXISTS actor_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL;

-- Synchronize existing data from sender_id to actor_id
UPDATE notifications 
SET actor_id = sender_id 
WHERE actor_id IS NULL;

-- Update RLS policies to allow insert/select with actor_id
DROP POLICY IF EXISTS "Users can insert notifications" ON notifications;

CREATE POLICY "Users can insert notifications" ON notifications
FOR INSERT WITH CHECK (
  auth.uid() = actor_id OR auth.uid() = sender_id
);

-- Note: We keep sender_id for backward compatibility but actor_id is now the primary field for actor info

-- Update the Comment Notification Trigger to include actor_id
CREATE OR REPLACE FUNCTION notify_on_comment() RETURNS TRIGGER AS $$
BEGIN
  -- Prevent self-notification
  IF NEW.user_id = (SELECT user_id FROM posts WHERE id = NEW.post_id) THEN
    RETURN NEW;
  END IF;

  INSERT INTO notifications (recipient_id, sender_id, actor_id, type, entity_type, entity_id, content)
  VALUES (
    (SELECT user_id FROM posts WHERE id = NEW.post_id), -- Recipient
    NEW.user_id, -- Keep sender_id
    NEW.user_id, -- Set actor_id
    'comment',
    'post',
    NEW.post_id,
    'commented on your post'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
