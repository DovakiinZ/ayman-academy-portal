-- ==============================================================================
-- 056_fix_slug_and_storage_rls.sql
-- Fixes for subject slug constraint and storage path compatibility
-- Version 2: Simplified DO blocks to avoid syntax errors
-- ==============================================================================

-- 1. Relax slug constraints
DO $$ 
BEGIN 
    BEGIN
        ALTER TABLE public.subjects ALTER COLUMN slug DROP NOT NULL;
    EXCEPTION WHEN OTHERS THEN 
        RAISE NOTICE 'Column slug in subjects might already be nullable';
    END;

    BEGIN
        ALTER TABLE public.courses ALTER COLUMN slug DROP NOT NULL;
    EXCEPTION WHEN OTHERS THEN 
        RAISE NOTICE 'Column slug in courses might already be nullable';
    END;
END $$;

-- 2. Storage Bucket and Policies for Avatars
DO $$ 
BEGIN 
    -- Ensure bucket exists
    INSERT INTO storage.buckets (id, name, public)
    SELECT 'avatars', 'avatars', true
    WHERE NOT EXISTS (
        SELECT 1 FROM storage.buckets WHERE id = 'avatars'
    );

    -- DROP AND RECREATE STORAGE POLICIES
    DROP POLICY IF EXISTS "Avatar Public View" ON storage.objects;
    DROP POLICY IF EXISTS "Avatar Self Upload" ON storage.objects;
    DROP POLICY IF EXISTS "Avatar Self Manage" ON storage.objects;
    DROP POLICY IF EXISTS "Avatar Self Delete" ON storage.objects;

    -- Public View
    EXECUTE 'CREATE POLICY "Avatar Public View" ON storage.objects FOR SELECT USING (bucket_id = ''avatars'')';

    -- Self Upload (userId/filename.ext)
    EXECUTE 'CREATE POLICY "Avatar Self Upload" ON storage.objects FOR INSERT TO authenticated 
    WITH CHECK (
        bucket_id = ''avatars'' AND 
        (split_part(name, ''/'', 1) = auth.uid()::text)
    )';

    -- Self Manage
    EXECUTE 'CREATE POLICY "Avatar Self Manage" ON storage.objects FOR UPDATE TO authenticated 
    USING (
        bucket_id = ''avatars'' AND 
        (split_part(name, ''/'', 1) = auth.uid()::text)
    )
    WITH CHECK (
        bucket_id = ''avatars'' AND 
        (split_part(name, ''/'', 1) = auth.uid()::text)
    )';

    -- Self Delete
    EXECUTE 'CREATE POLICY "Avatar Self Delete" ON storage.objects FOR DELETE TO authenticated 
    USING (
        bucket_id = ''avatars'' AND 
        (split_part(name, ''/'', 1) = auth.uid()::text)
    )';

END $$;

-- 3. Final Schema Checks and Cache Refresh
DO $$ 
BEGIN 
    -- Ensure profiles columns exist (bio, qualifications)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'bio_ar') THEN
        ALTER TABLE public.profiles ADD COLUMN bio_ar TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'bio_en') THEN
        ALTER TABLE public.profiles ADD COLUMN bio_en TEXT;
    END IF;
    
    -- Reload schema cache
    NOTIFY pgrst, 'reload schema';
END $$;

SELECT 'Migration 056 (v2) completed successfully' as result;
