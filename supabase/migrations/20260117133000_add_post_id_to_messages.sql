-- Add post_id column to messages for shared posts
ALTER TABLE public.messages ADD COLUMN IF NOT EXISTS post_id uuid REFERENCES public.posts(id) ON DELETE SET NULL;

-- Enable joining
CREATE INDEX IF NOT EXISTS idx_messages_post_id ON public.messages(post_id);
