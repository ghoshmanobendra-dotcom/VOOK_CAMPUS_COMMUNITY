-- 1. Create post_likes table
CREATE TABLE IF NOT EXISTS post_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid REFERENCES posts(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE (post_id, user_id)
);

-- 2. Create post_comments table (Assuming it might not exist or need structure enforce)
CREATE TABLE IF NOT EXISTS post_comments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid REFERENCES posts(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  content text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- 3. RLS for post_likes
ALTER TABLE post_likes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "like_insert" ON post_likes;
CREATE POLICY "like_insert" ON post_likes FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "like_delete" ON post_likes;
CREATE POLICY "like_delete" ON post_likes FOR DELETE USING (user_id = auth.uid());

DROP POLICY IF EXISTS "like_read" ON post_likes;
CREATE POLICY "like_read" ON post_likes FOR SELECT USING (true);

-- 4. RLS for post_comments
ALTER TABLE post_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "comment_insert" ON post_comments;
CREATE POLICY "comment_insert" ON post_comments FOR INSERT WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "comment_read" ON post_comments;
CREATE POLICY "comment_read" ON post_comments FOR SELECT USING (true);


-- 5. Helper function to check if liked (optional, but good for RPC if needed, mostly used in raw queries though)
