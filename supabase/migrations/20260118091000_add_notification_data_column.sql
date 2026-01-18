-- Add data column to notifications table as requested (Option A)
-- This allows storing additional metadata like announcement_id for custom notification types
ALTER TABLE notifications 
ADD COLUMN IF NOT EXISTS data jsonb;
