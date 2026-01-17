-- Drop existing policies if they conflict
DROP POLICY IF EXISTS "Users can update their own likes" ON public.likes;

-- Create update policy
CREATE POLICY "Users can update their own likes" 
ON public.likes FOR UPDATE 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Ensure reaction_type column exists (idempotent)
ALTER TABLE public.likes ADD COLUMN IF NOT EXISTS reaction_type text DEFAULT '👍';
