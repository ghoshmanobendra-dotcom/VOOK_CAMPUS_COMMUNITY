-- Add read_by column for per-user read receipts
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS read_by jsonb DEFAULT '[]'::jsonb;

-- Function to mark a message as read by a specific user (idempotent)
CREATE OR REPLACE FUNCTION public.mark_message_read(p_message_id uuid, p_user_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE public.messages
  SET 
    -- Append user_id to read_by array if not already present
    read_by = (
      CASE
        WHEN read_by @> to_jsonb(p_user_id) THEN read_by
        ELSE read_by || to_jsonb(p_user_id)
      END
    ),
    -- Update legacy read_at if it's currently null
    read_at = COALESCE(read_at, now())
  WHERE id = p_message_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Batch mark read
CREATE OR REPLACE FUNCTION public.mark_messages_read_batch(p_message_ids uuid[], p_user_id uuid)
RETURNS void AS $$
BEGIN
  UPDATE public.messages
  SET 
    read_by = (
      CASE
        WHEN read_by @> to_jsonb(p_user_id) THEN read_by
        ELSE read_by || to_jsonb(p_user_id)
      END
    ),
    read_at = COALESCE(read_at, now())
  WHERE id = ANY(p_message_ids);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if a message is read by a user
CREATE OR REPLACE FUNCTION public.is_message_read(p_message_id uuid, p_user_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.messages 
    WHERE id = p_message_id 
    AND read_by @> to_jsonb(p_user_id)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
