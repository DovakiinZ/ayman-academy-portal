-- ==============================================================================
-- 025 TEACHER PROFILE ENHANCEMENTS
-- Adds expertise tags and creates storage bucket for avatars
-- ==============================================================================

-- 1. Add expertise tags columns to Profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS expertise_tags_ar TEXT[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS expertise_tags_en TEXT[] DEFAULT '{}';

-- 2. Create Storage Bucket for Avatars (Safe creation)
INSERT INTO storage.buckets (id, name, public)
SELECT 'avatars', 'avatars', true
WHERE NOT EXISTS (
    SELECT 1 FROM storage.buckets WHERE id = 'avatars'
);

-- 3. Storage RLS Policies
-- Allow anyone to view avatars
CREATE POLICY "Avatar Public View"
ON storage.objects FOR SELECT
USING (bucket_id = 'avatars');

-- Allow authenticated users to upload their own avatar
-- The path will be authenticated/userId/filename
CREATE POLICY "Avatar Self Upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'avatars' AND 
    (storage.foldername(name))[1] = auth.uid()::text
);

-- Allow users to update/delete their own avatar
CREATE POLICY "Avatar Self Manage"
ON storage.objects FOR UPDATE
TO authenticated
USING (
    bucket_id = 'avatars' AND 
    (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
    bucket_id = 'avatars' AND 
    (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Avatar Self Delete"
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id = 'avatars' AND 
    (storage.foldername(name))[1] = auth.uid()::text
);
