-- Add parent_id to post_comments for threading support
ALTER TABLE post_comments ADD COLUMN IF NOT EXISTS parent_id uuid REFERENCES post_comments(id) ON DELETE CASCADE;

-- Add RLS for threading if needed (inherit from basic read/write)
-- existing policies cover insert/read/delete based on user_id. 
