-- Fix Storage Policies to ensure images are PUBLIC

-- 1. Ensure 'images' bucket exists and is public
INSERT INTO storage.buckets (id, name, public) 
VALUES ('images', 'images', TRUE) 
ON CONFLICT (id) DO UPDATE SET public = TRUE;

-- 2. Drop ALL existing policies on storage.objects for the 'images' bucket to avoid conflicts
-- Note: We can't easily drop "all policies for a bucket", we have to drop by name. 
-- We'll try to drop common names used in this project.
DROP POLICY IF EXISTS "Images are publicly accessible." ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload images." ON storage.objects;
DROP POLICY IF EXISTS "Users can delete own images" ON storage.objects;
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Upload" ON storage.objects;
DROP POLICY IF EXISTS "Owner Delete" ON storage.objects;

-- 3. Create a PERMISSIVE Select Policy (Public Read)
-- This allows anyone (authenticated or anonymous) to view files in the 'images' bucket.
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'images' );

-- 4. Create Authenticated Insert Policy
-- Allows any logged-in user to upload to 'images' bucket.
CREATE POLICY "Authenticated Upload"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'images' 
  AND auth.role() = 'authenticated'
);

-- 5. Create Owner Delete Policy
-- Allows users to delete files where the root folder name matches their User ID.
-- Matches the frontend logic: fileName = `${userId}/...`
CREATE POLICY "Owner Delete"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'images'
  AND (auth.uid()::text = (storage.foldername(name))[1])
);
