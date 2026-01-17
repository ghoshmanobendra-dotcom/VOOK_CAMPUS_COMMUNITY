-- Add reaction_type to likes table to support multiple emoji reactions
ALTER TABLE public.likes ADD COLUMN IF NOT EXISTS reaction_type text DEFAULT 'like';
