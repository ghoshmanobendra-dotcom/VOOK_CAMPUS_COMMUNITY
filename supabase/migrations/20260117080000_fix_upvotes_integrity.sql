-- Ensure upvotes are never null and start at 0
UPDATE public.posts 
SET upvotes = 0 
WHERE upvotes IS NULL;

-- Enforce default and not null constraint
ALTER TABLE public.posts 
ALTER COLUMN upvotes SET DEFAULT 0,
ALTER COLUMN upvotes SET NOT NULL;

-- Prevent negative upvotes
ALTER TABLE public.posts DROP CONSTRAINT IF EXISTS check_upvotes_non_negative;
ALTER TABLE public.posts ADD CONSTRAINT check_upvotes_non_negative CHECK (upvotes >= 0);

-- Recalculate upvotes from likes table to ensure data consistency
-- This ensures "starts from 0" (if no likes) "to something big" (actual count)
UPDATE public.posts p
SET upvotes = (
    SELECT count(*) 
    FROM public.likes l 
    WHERE l.post_id = p.id
);
