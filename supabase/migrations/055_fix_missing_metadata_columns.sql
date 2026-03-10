-- Migration 055: Fix Missing Metadata Columns
-- Purpose: Add columns that are expected by the frontend but were missing from the schema cache.

DO $$ 
BEGIN 
    -- 1. SUBJECTS: Add missing columns
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'subjects' AND column_name = 'description_ar') THEN
        ALTER TABLE public.subjects ADD COLUMN description_ar TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'subjects' AND column_name = 'description_en') THEN
        ALTER TABLE public.subjects ADD COLUMN description_en TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'subjects' AND column_name = 'access_type') THEN
        ALTER TABLE public.subjects ADD COLUMN access_type TEXT NOT NULL DEFAULT 'stage';
        
        -- Add check constraint for access_type
        BEGIN
            ALTER TABLE public.subjects ADD CONSTRAINT subjects_access_type_check 
            CHECK (access_type IN ('public','stage','subscription','invite_only','org_only'));
        EXCEPTION WHEN OTHERS THEN 
            RAISE NOTICE 'Constraint subjects_access_type_check might already exist';
        END;
    END IF;

    -- IMPORTANT: Add teacher_id to subjects to track ownership
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'subjects' AND column_name = 'teacher_id') THEN
        ALTER TABLE public.subjects ADD COLUMN teacher_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;
    END IF;

    -- 2. PROFILES: Add missing columns
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'qualifications') THEN
        ALTER TABLE public.profiles ADD COLUMN qualifications TEXT;
    END IF;

END $$;

-- ══════════════════════════════════════════════════════════════════════════════
-- 3. RLS POLICIES FOR TEACHERS (SUBJECTS)
-- ══════════════════════════════════════════════════════════════════════════════

-- Allow teachers to insert subjects (setting themselves as owner)
DROP POLICY IF EXISTS "Teachers can insert own subjects" ON public.subjects;
CREATE POLICY "Teachers can insert own subjects"
    ON public.subjects FOR INSERT
    WITH CHECK (
        (public.get_user_role() = 'teacher' AND (teacher_id = auth.uid() OR teacher_id IS NULL))
        OR public.get_user_role() = 'super_admin'
    );

-- Allow teachers to manage their own subjects
DROP POLICY IF EXISTS "Teachers can manage own subjects" ON public.subjects;
CREATE POLICY "Teachers can manage own subjects"
    ON public.subjects FOR ALL
    USING (
        teacher_id = auth.uid()
        OR public.get_user_role() = 'super_admin'
    )
    WITH CHECK (
        teacher_id = auth.uid()
        OR public.get_user_role() = 'super_admin'
    );

-- ══════════════════════════════════════════════════════════════════════════════
-- 4. RELOAD SCHEMA CACHE
-- ══════════════════════════════════════════════════════════════════════════════
NOTIFY pgrst, 'reload schema';
