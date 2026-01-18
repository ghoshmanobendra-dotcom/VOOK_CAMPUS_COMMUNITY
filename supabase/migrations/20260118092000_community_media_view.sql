-- Create central community_media table using a VIEW for simplified access
-- accessing posts and announcements tables

-- Fix: Check if file_urls columns exist, and if not, handle gracefully or create them.
-- Since the error says "column file_urls does not exist", we assume the posts table doesn't have it yet.
-- Announcements table was created recently so it might have it, but let's be safe.

-- 1. Ensure columns exist
ALTER TABLE posts ADD COLUMN IF NOT EXISTS file_urls text[];
ALTER TABLE announcements ADD COLUMN IF NOT EXISTS file_urls text[];

-- 2. Create the View
CREATE OR REPLACE VIEW community_media AS
SELECT 
  id::text || '_img_' || idx as id, -- Unique composite ID
  community_id,
  user_id as uploader_id,
  url as media_url,
  'image' as media_type,
  created_at
FROM posts, unnest(image_urls) WITH ORDINALITY as t(url, idx)
WHERE community_id IS NOT NULL

UNION ALL

SELECT 
  id::text || '_vid_' as id,
  community_id,
  user_id as uploader_id,
  video_url as media_url,
  'video' as media_type,
  created_at
FROM posts
WHERE community_id IS NOT NULL 
AND video_url IS NOT NULL

UNION ALL

SELECT
   id::text || '_file_' || idx as id,
   community_id,
   user_id as uploader_id,
   url as media_url,
   'file' as media_type,
   created_at
FROM posts, unnest(file_urls) WITH ORDINALITY as t(url, idx)
WHERE community_id IS NOT NULL

UNION ALL

-- Announcements
SELECT 
  id::text || '_ann_img_' || idx as id,
  community_id,
  author_id as uploader_id,
  url as media_url,
  'image' as media_type,
  created_at
FROM announcements, unnest(image_urls) WITH ORDINALITY as t(url, idx)
WHERE community_id IS NOT NULL

UNION ALL

SELECT 
  id::text || '_ann_file_' || idx as id,
  community_id,
  author_id as uploader_id,
  url as media_url,
  'file' as media_type,
  created_at
FROM announcements, unnest(file_urls) WITH ORDINALITY as t(url, idx)
WHERE community_id IS NOT NULL;

-- 3. Security
ALTER VIEW community_media OWNER TO postgres;
ALTER VIEW community_media SET (security_invoker = true);

-- 4. Update Policies (if not already added)
DROP POLICY IF EXISTS "Admins can update community details" ON communities;

CREATE POLICY "Admins can update community details" ON communities
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM community_members
    WHERE community_id = communities.id
    AND user_id = auth.uid()
    AND role IN ('admin', 'owner')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM community_members
    WHERE community_id = communities.id
    AND user_id = auth.uid()
    AND role IN ('admin', 'owner')
  )
);
