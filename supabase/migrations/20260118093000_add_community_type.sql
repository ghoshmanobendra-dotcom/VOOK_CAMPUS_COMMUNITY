-- Add type column to communities table for privacy settings
-- Defaulting to 'public' for existing communities
ALTER TABLE communities 
ADD COLUMN IF NOT EXISTS type text DEFAULT 'public' CHECK (type IN ('public', 'private'));

-- Update RLS to respect privacy?
-- Currently: "Everyone in community can view" -> logic exists for members.
-- We might want a policy: "Public communities are viewable by everyone"

-- Let's update the "Community members can view announcements" equivalent for communities table itself if it exists
-- Usually communities are visible to search.

-- Ensure the column is accessible
GRANT SELECT, UPDATE ON communities TO authenticated;
GRANT SELECT ON communities TO anon;
