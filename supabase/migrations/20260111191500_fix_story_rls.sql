-- Enable RLS
ALTER TABLE stories ENABLE ROW LEVEL SECURITY;

-- 1. VIEW POLICY
DROP POLICY IF EXISTS "Stories View Policy" ON stories;
CREATE POLICY "Stories View Policy" ON stories
FOR SELECT
USING (
  -- User is the owner
  auth.uid() = user_id 
  -- OR Story is Public
  OR visibility = 'public'
  -- OR Story is Campus-limited and users share a campus
  OR (visibility = 'campus' AND campus_id IN (
    SELECT college FROM profiles WHERE id = auth.uid()
  ))
  -- OR Story is Followers-limited and user is a follower (assuming 'follows' table exists)
  -- Note: If 'follows' table has different structure, this needs adjustment. 
  -- safely skipping complex follower check if table structure is unknown, relying on Public/Campus for now usually covers 90% of use cases.
  -- But adding a generic check if 'follows' exists:
  OR (visibility = 'followers' AND EXISTS (
    SELECT 1 FROM follows WHERE follower_id = auth.uid() AND following_id = stories.user_id
  ))
);

-- 2. INSERT POLICY
DROP POLICY IF EXISTS "Stories Insert Policy" ON stories;
CREATE POLICY "Stories Insert Policy" ON stories
FOR INSERT
WITH CHECK (
  auth.uid() = user_id
);

-- 3. UPDATE POLICY
DROP POLICY IF EXISTS "Stories Update Policy" ON stories;
CREATE POLICY "Stories Update Policy" ON stories
FOR UPDATE
USING (
  auth.uid() = user_id
);

-- 4. DELETE POLICY
DROP POLICY IF EXISTS "Stories Delete Policy" ON stories;
CREATE POLICY "Stories Delete Policy" ON stories
FOR DELETE
USING (
  auth.uid() = user_id
);
