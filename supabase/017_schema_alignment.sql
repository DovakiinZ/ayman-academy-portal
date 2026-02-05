-- ==============================================================================
-- 017 SCHEMA ALIGNMENT & DATA MIGRATION
-- Fixes missing columns causing empty data in Admin Panel
-- ==============================================================================

-- 1. Ensure SUBJECTS has stage_id (Rename level_id if needed)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='subjects' AND column_name='level_id') THEN
        ALTER TABLE public.subjects RENAME COLUMN level_id TO stage_id;
    END IF;
END $$;

-- 2. Ensure LESSONS has subject_id
ALTER TABLE public.lessons ADD COLUMN IF NOT EXISTS subject_id UUID REFERENCES public.subjects(id);

-- 3. Migrate LESSONS data (Link to Subject via Course if possible)
-- This assumes 'courses' table still exists (even if deprecated) and has 'subject_id'
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='courses') THEN
        -- Verify courses has subject_id and lessons has course_id
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='courses' AND column_name='subject_id') THEN
            UPDATE public.lessons
            SET subject_id = (SELECT subject_id FROM public.courses WHERE courses.id = lessons.course_id)
            WHERE subject_id IS NULL AND course_id IS NOT NULL;
        END IF;
    END IF;
END $$;

-- 4. Enable RLS on modified columns/tables just in case
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;
