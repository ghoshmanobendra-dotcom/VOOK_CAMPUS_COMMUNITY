-- Create Announcements Table
CREATE TYPE announcement_priority AS ENUM ('low', 'normal', 'high', 'urgent');

CREATE TABLE IF NOT EXISTS announcements (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    community_id UUID REFERENCES communities(id) ON DELETE CASCADE,
    author_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    title TEXT,
    content TEXT NOT NULL,
    priority announcement_priority DEFAULT 'normal',
    is_pinned BOOLEAN DEFAULT false,
    image_urls TEXT[],
    file_urls TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Likes/Reactions for announcements (Separate or reuse likes? Reusing generic likes table is harder if it references posts(id) directly. 
-- Assuming 'likes' table might have post_id. Let's create a dedicated table for cleanliness or check if we can reuse.)
-- For this "Professional" system, let's make it robust.

CREATE TABLE IF NOT EXISTS announcement_reactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    announcement_id UUID REFERENCES announcements(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    reaction_type TEXT DEFAULT 'like', -- 'like', 'love', 'urgent_ack', etc.
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(announcement_id, user_id, reaction_type)
);

CREATE TABLE IF NOT EXISTS announcement_views (
    announcement_id UUID REFERENCES announcements(id) ON DELETE CASCADE,
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    viewed_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    PRIMARY KEY (announcement_id, user_id)
);

-- RLS
ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcement_reactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE announcement_views ENABLE ROW LEVEL SECURITY;

-- Policies
-- Everyone in community can view
CREATE POLICY "Community members can view announcements" ON announcements
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM community_members 
            WHERE community_id = announcements.community_id 
            AND user_id = auth.uid()
        )
    );

-- Only admins/moderators can create
CREATE POLICY "Admins can create announcements" ON announcements
    FOR INSERT WITH CHECK (
        EXISTS (
            SELECT 1 FROM community_members 
            WHERE community_id = announcements.community_id 
            AND user_id = auth.uid()
            AND role IN ('admin', 'moderator', 'owner')
        )
    );

-- Same for update/delete
CREATE POLICY "Admins can update announcements" ON announcements
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM community_members 
            WHERE community_id = announcements.community_id 
            AND user_id = auth.uid()
            AND role IN ('admin', 'moderator', 'owner')
        )
    );
    
-- Views policies
CREATE POLICY "Users can insert their own views" ON announcement_views
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can see view counts" ON announcement_views
    FOR SELECT USING (true); -- Or restricted to community

-- Migration: Move 'official' posts to announcements
INSERT INTO announcements (
  id, 
  community_id, 
  author_id, 
  content, 
  created_at, 
  image_urls
)
SELECT 
  id, 
  community_id, 
  user_id, 
  content, 
  created_at, 
  image_urls 
FROM posts 
WHERE is_official = true;

-- Note: We are preserving IDs so likes *could* be migrated if tables were polymorphic, but here we kept them separate.
-- For now, we just migrate the content.
