-- Create Delete Policy for post_comments
-- Users can only delete their own comments

CREATE POLICY "Users can delete their own comments"
ON post_comments
FOR DELETE
USING (auth.uid() = user_id);

-- Also ensure Update policy exists if users want to edit later (optional but good practice)
CREATE POLICY "Users can update their own comments"
ON post_comments
FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);
