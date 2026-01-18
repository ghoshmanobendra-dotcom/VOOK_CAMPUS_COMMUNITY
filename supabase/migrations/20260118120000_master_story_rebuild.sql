
-- 🔥 PHASE 1: CLEANUP
-- Completely remove old story system to avoid conflicts
DROP TABLE IF EXISTS story_views CASCADE;
DROP TABLE IF EXISTS story_likes CASCADE;
DROP TABLE IF EXISTS story_replies CASCADE;
DROP TABLE IF EXISTS story_comments CASCADE; -- Legacy name found in code
DROP TABLE IF EXISTS stories CASCADE;

-- 🔥 PHASE 2: NEW TABLES

-- 1. Stories Table
CREATE TABLE stories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  media_url text NOT NULL,
  media_type text CHECK (media_type IN ('image','video','text')),
  caption text,
  visibility text CHECK (visibility IN ('public','followers','campus')) DEFAULT 'public',
  campus_id text, -- Optional: to support 'campus' visibility filtering explicitly if needed
  created_at timestamptz DEFAULT now(),
  expires_at timestamptz NOT NULL
);

-- 2. Story Views (Seen State & Viewer List)
CREATE TABLE story_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id uuid REFERENCES stories(id) ON DELETE CASCADE,
  viewer_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  viewed_at timestamptz DEFAULT now(),
  UNIQUE (story_id, viewer_id)
);

-- 3. Story Likes (Interactions)
CREATE TABLE story_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id uuid REFERENCES stories(id) ON DELETE CASCADE,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE (story_id, user_id)
);

-- 4. Story Replies (Direct Messages inspired)
CREATE TABLE story_replies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  story_id uuid REFERENCES stories(id) ON DELETE CASCADE,
  sender_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  message text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- 🔥 PHASE 3: RLS POLICIES

ALTER TABLE stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE story_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE story_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE story_replies ENABLE ROW LEVEL SECURITY;

-- 1. STORIES VISIBILITY
-- Users can see stories if:
-- a) They are the owner
-- b) Story is public
-- c) Story is campus (and user is same campus? For now assuming public for campus or strictly match logic if campus_id exists)
-- d) Story is followers (and user follows owner)
-- AND story is not expired.

CREATE POLICY "Stories are visible to appropriate audience"
ON stories FOR SELECT
USING (
  expires_at > now() 
  AND (
    user_id = auth.uid() -- Owner
    OR visibility = 'public'
    OR visibility = 'campus' -- Simplified: Campus posts visible to basic app users (Logic handled in query usually, but RLS safe)
    OR (
      visibility = 'followers'
      AND user_id IN (
        SELECT following_id FROM follows WHERE follower_id = auth.uid()
      )
    )
  )
);

CREATE POLICY "Users can insert their own stories"
ON stories FOR INSERT
WITH CHECK (
  user_id = auth.uid()
  AND expires_at > created_at
);

CREATE POLICY "Users can delete their own stories"
ON stories FOR DELETE
USING (user_id = auth.uid());

-- 2. VIEWS
-- Users can insert a view for any valid story they can see
CREATE POLICY "Users can view stories"
ON story_views FOR INSERT
WITH CHECK (
  viewer_id = auth.uid()
  AND EXISTS (SELECT 1 FROM stories WHERE id = story_id)
);

-- Owner can see who viewed their story
CREATE POLICY "Owners can see viewers"
ON story_views FOR SELECT
USING (
  EXISTS (SELECT 1 FROM stories WHERE id = story_id AND user_id = auth.uid())
);

-- User can see their own view record (to know if they saw it)
CREATE POLICY "Users can see their own views"
ON story_views FOR SELECT
USING (viewer_id = auth.uid());

-- 3. LIKES
-- Users can like stories
CREATE POLICY "Users can like stories"
ON story_likes FOR INSERT
WITH CHECK (user_id = auth.uid());

-- Users can unlike
CREATE POLICY "Users can unlike"
ON story_likes FOR DELETE
USING (user_id = auth.uid());

-- Everyone can see likes (for count) or just owner? 
-- Usually everyone sees usage count, but list is owner only. 
-- For simplicity, let's allow seeing likes to show "User like status".
CREATE POLICY "Impact visibility"
ON story_likes FOR SELECT
USING (true); 

-- 4. REPLIES
-- Sending a reply
CREATE POLICY "Users can reply to stories"
ON story_replies FOR INSERT
WITH CHECK (sender_id = auth.uid());

-- Owner can see replies to their stories
CREATE POLICY "Owners see replies"
ON story_replies FOR SELECT
USING (
  sender_id = auth.uid() OR
  EXISTS (SELECT 1 FROM stories WHERE id = story_id AND user_id = auth.uid())
);

-- 🔥 REALTIME
-- Enable realtime for stories to support instant updates
ALTER PUBLICATION supabase_realtime ADD TABLE stories;
ALTER PUBLICATION supabase_realtime ADD TABLE story_likes;
ALTER PUBLICATION supabase_realtime ADD TABLE story_views;

-- INDEXES FOR PERFORMANCE
CREATE INDEX idx_stories_user_expires ON stories(user_id, expires_at);
CREATE INDEX idx_stories_visibility ON stories(visibility);
CREATE INDEX idx_story_views_story ON story_views(story_id);
CREATE INDEX idx_story_likes_story ON story_likes(story_id);
