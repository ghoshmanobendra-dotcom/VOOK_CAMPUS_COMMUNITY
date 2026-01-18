-- FIX 1: Correct RLS Policy for Story Visibility
DROP POLICY IF EXISTS "story_visibility_select" ON stories;

CREATE POLICY "story_visibility_select"
ON stories
FOR SELECT
USING (
  expires_at > now()
  AND (
    -- Owner sees their own story
    user_id = auth.uid()

    -- Public stories visible to everyone
    OR visibility = 'public'

    -- Followers only visible to followers
    OR (
      visibility = 'followers'
      AND EXISTS (
        SELECT 1 FROM follows
        WHERE follower_id = auth.uid()
        AND following_id = stories.user_id
      )
    )

    -- Campus only visible to same college
    OR (
      visibility = 'campus'
      AND EXISTS (
        SELECT 1 FROM profiles p1
        JOIN profiles p2 ON p1.college = p2.college
        WHERE p1.id = auth.uid()
        AND p2.id = stories.user_id
      )
    )
  )
);

-- FIX 2: Ensure proper DELETE policy for owners (if not already set)
DROP POLICY IF EXISTS "story_owner_delete" ON stories;
CREATE POLICY "story_owner_delete"
ON stories
FOR DELETE
USING (user_id = auth.uid());
