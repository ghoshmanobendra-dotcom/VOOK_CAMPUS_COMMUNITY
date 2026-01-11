-- Enable RLS
ALTER TABLE stories ENABLE ROW LEVEL SECURITY;

-- DROP existing policies to be clean
DROP POLICY IF EXISTS "Stories View Policy" ON stories;
DROP POLICY IF EXISTS "Stories Insert Policy" ON stories;
DROP POLICY IF EXISTS "Stories Update Policy" ON stories;
DROP POLICY IF EXISTS "Stories Delete Policy" ON stories;
DROP POLICY IF EXISTS "allow_all_read" ON stories;
DROP POLICY IF EXISTS "story_visibility" ON stories;


-- 1. SELECT POLICY (Reading Stories)
-- We enforce that stories must be active (not expired) AND visible to the viewer.
CREATE POLICY "Stories View Policy" ON stories
FOR SELECT
USING (
    -- 1. Not expired (unless it's your own, maybe you want to see archives? but standard is active only)
    -- For simplicty and per prompt: expires_at > now()
    expires_at > now()
    AND (
        -- 2a. Own Story
        auth.uid() = user_id
        
        -- 2b. Public Story
        OR visibility = 'public'
        
        -- 2c. Campus Story (Shared Campus)
        OR (
            visibility = 'campus' 
            AND EXISTS (
                SELECT 1 FROM profiles viewer 
                WHERE viewer.id = auth.uid() 
                AND viewer.college = (SELECT college FROM profiles owner WHERE owner.id = stories.user_id)
            )
        )
        
        -- 2d. Followers Story
        OR (
            visibility = 'followers'
            AND EXISTS (
                 -- Assuming 'follows' table: follower_id follows following_id
                 SELECT 1 FROM follows 
                 WHERE follower_id = auth.uid() 
                 AND following_id = stories.user_id
            )
        )
    )
);

-- 2. INSERT POLICY
CREATE POLICY "Stories Insert Policy" ON stories
FOR INSERT
WITH CHECK (
    auth.uid() = user_id
);

-- 3. DELETE POLICY
CREATE POLICY "Stories Delete Policy" ON stories
FOR DELETE
USING (
    auth.uid() = user_id
);
