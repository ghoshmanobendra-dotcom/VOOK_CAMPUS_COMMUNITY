-- Rebuild Stories System (Instagram/WhatsApp Style)

-- 1. Drop existing policies to avoid conflicts during rebuild
DROP POLICY IF EXISTS "story_visibility" ON stories;
DROP POLICY IF EXISTS "story_insert" ON stories;
DROP POLICY IF EXISTS "Stories View Policy" ON stories;
DROP POLICY IF EXISTS "Stories Insert Policy" ON stories;
DROP POLICY IF EXISTS "Stories Update Policy" ON stories;
DROP POLICY IF EXISTS "Stories Delete Policy" ON stories;

-- 2. Update/Verify 'stories' table structure
-- We will alter existing table to match requirements to avoid total data loss if possible, 
-- but ensure all constraints are met.
ALTER TABLE stories ADD COLUMN IF NOT EXISTS media_type text CHECK (media_type IN ('image', 'video')) DEFAULT 'image';
ALTER TABLE stories ADD COLUMN IF NOT EXISTS expires_at timestamptz DEFAULT (now() + interval '24 hours');

-- Ensure expires_at is NOT NULL (might need to update existing rows first if they mean 'forever', but let's just default them)
UPDATE stories SET expires_at = created_at + interval '24 hours' WHERE expires_at IS NULL;
ALTER TABLE stories ALTER COLUMN expires_at SET NOT NULL;

-- 3. Create 'story_views' table
CREATE TABLE IF NOT EXISTS story_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id uuid REFERENCES stories(id) ON DELETE CASCADE,
  viewer_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  viewed_at timestamptz DEFAULT now(),
  UNIQUE (story_id, viewer_id)
);

-- 4. Create 'story_reactions' table
CREATE TABLE IF NOT EXISTS story_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id uuid REFERENCES stories(id) ON DELETE CASCADE,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  reaction text,
  created_at timestamptz DEFAULT now(),
  UNIQUE (story_id, user_id)
);

-- 5. Create 'story_replies' table
CREATE TABLE IF NOT EXISTS story_replies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id uuid REFERENCES stories(id) ON DELETE CASCADE,
  sender_id uuid REFERENCES profiles(id),
  message text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on all
ALTER TABLE stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE story_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE story_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE story_replies ENABLE ROW LEVEL SECURITY;

-- 6. RLS Policies

-- STORIES
-- Visible if not expired AND (Owner OR Follower)
-- Note: 'follows' table assumed to exist (follower_id, following_id) based on previous context
CREATE POLICY "story_visibility_v2"
ON stories
FOR SELECT
USING (
  expires_at > now()
  AND (
    user_id = auth.uid()
    OR user_id IN (
      SELECT following_id FROM follows
      WHERE follower_id = auth.uid()
    )
    -- Include 'public' visibility if legacy support needed? 
    -- User prompt says "relationship-based visibility... No exceptions"
    -- But previous interactions had 'public'/'campus'. 
    -- The PROMPT specific specification says: "Viewer is: The story owner OR Allowed by relationship rules (followers / contacts / campus if you want)"
    -- I will stick to Owner OR Follower OR Campus (since user mentioned "campus if you want" and this app is Campus based)
    OR (
        -- Campus check: User is in same campus
        EXISTS (
            SELECT 1 FROM profiles viewer 
            JOIN profiles owner ON owner.id = stories.user_id
            WHERE viewer.id = auth.uid() 
            AND viewer.college = owner.college
        )
    )
  )
);

CREATE POLICY "story_insert_v2"
ON stories
FOR INSERT
WITH CHECK (
  user_id = auth.uid()
  -- Ensure expires_at is reasonably in future (handled by backend mostly but good check)
);

CREATE POLICY "story_delete_v2"
ON stories
FOR DELETE
USING (user_id = auth.uid());

-- STORY VIEWS
CREATE POLICY "view_insert"
ON story_views
FOR INSERT
WITH CHECK (viewer_id = auth.uid());

CREATE POLICY "view_select"
ON story_views
FOR SELECT
USING (
    viewer_id = auth.uid() 
    OR 
    story_id IN (SELECT id FROM stories WHERE user_id = auth.uid())
); -- Viewers can see their own views, Owners can see who viewed their story

-- STORY REACTIONS
CREATE POLICY "reaction_insert"
ON story_reactions
FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "reaction_select"
ON story_reactions
FOR SELECT
USING (
    user_id = auth.uid()
    OR
    story_id IN (SELECT id FROM stories WHERE user_id = auth.uid())
);

-- STORY REPLIES
CREATE POLICY "reply_insert"
ON story_replies
FOR INSERT
WITH CHECK (sender_id = auth.uid());

CREATE POLICY "reply_select"
ON story_replies
FOR SELECT
USING (
    sender_id = auth.uid()
    OR
    story_id IN (SELECT id FROM stories WHERE user_id = auth.uid())
);
