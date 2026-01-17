-- 1. Create junction table for Cross-Community Groups
CREATE TABLE IF NOT EXISTS public.community_groups (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  group_id uuid REFERENCES public.chats(id) ON DELETE CASCADE NOT NULL,
  community_id uuid REFERENCES public.communities(id) ON DELETE CASCADE NOT NULL,
  added_by uuid REFERENCES public.profiles(id),
  added_at timestamp with time zone DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(group_id, community_id)
);

-- 2. Enable RLS
ALTER TABLE public.community_groups ENABLE ROW LEVEL SECURITY;

-- 3. RLS Policies
-- View: Everyone (allows discovering groups in a community)
DROP POLICY IF EXISTS "Community groups are viewable by everyone" ON public.community_groups;
CREATE POLICY "Community groups are viewable by everyone"
  ON public.community_groups FOR SELECT USING (true);

-- Insert: Authenticated users (Logic in API/Frontend checks admin status, but DB allows auth users)
DROP POLICY IF EXISTS "Authenticated users can add groups" ON public.community_groups;
CREATE POLICY "Authenticated users can add groups"
  ON public.community_groups FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- 4. Backfill existing data
-- Migrate existing 1:1 relationships to the new N:M table
INSERT INTO public.community_groups (group_id, community_id, added_by, added_at)
SELECT 
    id, 
    community_id, 
    created_by, 
    created_at
FROM public.chats
WHERE community_id IS NOT NULL AND type = 'group'
ON CONFLICT (group_id, community_id) DO NOTHING;

-- 5. Update Chats Visibility Policy
-- Allow viewing a chat if it is linked to ANY community via community_groups
DROP POLICY IF EXISTS "Community groups are viewable by everyone" ON public.chats;
CREATE POLICY "Community groups are viewable by everyone"
  ON public.chats FOR SELECT
  USING (
    -- Original check: directly linked
    community_id IS NOT NULL
    -- New check: linked via junction table
    OR EXISTS (
      SELECT 1 FROM public.community_groups cg WHERE cg.group_id = id
    )
  );
