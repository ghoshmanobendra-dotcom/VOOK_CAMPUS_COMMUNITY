-- 1. Add post_type and community_id if missing
-- Note: 'community_tag' existed but 'community_id' might be missing on posts table as per schema review (it was only on chats table? No, schema file showed chats changes but posts table defined in line 53 didn't explicitly show community_id linking to communities table in the snippet provided, although migration 20260117010000_add_community_id_posts.sql might have added it. Let's ensure it exists and enforce type.)

ALTER TABLE public.posts 
ADD COLUMN IF NOT EXISTS community_id uuid REFERENCES public.communities(id);

ALTER TABLE public.posts 
ADD COLUMN IF NOT EXISTS post_type text DEFAULT 'personal';

-- 2. Backfill post_type based on community_id
UPDATE public.posts 
SET post_type = 'community' 
WHERE community_id IS NOT NULL;

UPDATE public.posts 
SET post_type = 'personal' 
WHERE community_id IS NULL AND post_type IS NULL;

-- 3. Add Check Constraint
-- Drop first to avoid error if exists
ALTER TABLE public.posts DROP CONSTRAINT IF EXISTS check_post_type_logic;

ALTER TABLE public.posts 
ADD CONSTRAINT check_post_type_logic 
CHECK (
  (post_type = 'community' AND community_id IS NOT NULL) OR
  (post_type = 'personal' AND community_id IS NULL)
);

-- 4. Create Indexes
CREATE INDEX IF NOT EXISTS idx_posts_user_type ON public.posts(user_id, post_type);
CREATE INDEX IF NOT EXISTS idx_posts_community_id ON public.posts(community_id);
