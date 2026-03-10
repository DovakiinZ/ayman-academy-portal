-- ==============================================================================
-- 057_fix_lessons_schema.sql
-- Fixes for lesson creation failure (400 Bad Request)
-- Ensures all columns used in TeacherLessons.tsx exist in the lessons table.
-- ==============================================================================

DO $$ 
BEGIN 
    -- 1. Ensure core columns exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'lessons' AND column_name = 'slug') THEN
        ALTER TABLE public.lessons ADD COLUMN slug TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'lessons' AND column_name = 'order_index') THEN
        ALTER TABLE public.lessons ADD COLUMN order_index INT DEFAULT 0;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'lessons' AND column_name = 'is_paid') THEN
        ALTER TABLE public.lessons ADD COLUMN is_paid BOOLEAN DEFAULT true;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'lessons' AND column_name = 'is_published') THEN
        ALTER TABLE public.lessons ADD COLUMN is_published BOOLEAN DEFAULT false;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'lessons' AND column_name = 'created_by') THEN
        ALTER TABLE public.lessons ADD COLUMN created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'lessons' AND column_name = 'subject_id') THEN
        ALTER TABLE public.lessons ADD COLUMN subject_id UUID REFERENCES public.subjects(id) ON DELETE CASCADE;
    END IF;

    -- 2. Relax NOT NULL constraints on legacy columns
    BEGIN
        ALTER TABLE public.lessons ALTER COLUMN course_id DROP NOT NULL;
    EXCEPTION WHEN OTHERS THEN NULL; END;

    -- 3. Update Unique Constraints
    -- Drop old unique constraint if it exists
    ALTER TABLE public.lessons DROP CONSTRAINT IF EXISTS lessons_course_id_slug_key;
    
    -- Add new unique constraint on (subject_id, slug) if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'lessons_subject_id_slug_key') THEN
        -- Only add if columns exist and are ready
        ALTER TABLE public.lessons ADD CONSTRAINT lessons_subject_id_slug_key UNIQUE (subject_id, slug);
    END IF;

    -- 4. Ensure RLS is enabled and policies allow teacher access
    ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;

    -- Drop legacy policies if they exist to avoid conflicts
    DROP POLICY IF EXISTS "Lessons are viewable by everyone" ON public.lessons;
    DROP POLICY IF EXISTS "Teachers can manage own lessons" ON public.lessons;
    DROP POLICY IF EXISTS "Lessons are viewable by everyone" ON public.lessons;
    DROP POLICY IF EXISTS "lessons_select_published" ON public.lessons;
    DROP POLICY IF EXISTS "lessons_teacher" ON public.lessons;
    DROP POLICY IF EXISTS "lessons_admin" ON public.lessons;

    -- Public read for published lessons
    CREATE POLICY "Lessons are viewable by everyone" ON public.lessons
        FOR SELECT USING (
            is_published = true 
            OR auth.uid() = created_by 
            -- Check if subject owner
            OR EXISTS (SELECT 1 FROM subjects s WHERE s.id = lessons.subject_id AND s.teacher_id = auth.uid())
            OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
        );

    -- Teacher management
    CREATE POLICY "Teachers can manage own lessons" ON public.lessons
        FOR ALL USING (
            auth.uid() = created_by 
            OR EXISTS (SELECT 1 FROM subjects s WHERE s.id = lessons.subject_id AND s.teacher_id = auth.uid())
            OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
        )
        WITH CHECK (
            auth.uid() = created_by 
            OR EXISTS (SELECT 1 FROM subjects s WHERE s.id = lessons.subject_id AND s.teacher_id = auth.uid())
            OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
        );

    -- 5. Reload schema cache
    NOTIFY pgrst, 'reload schema';
END $$;

SELECT 'Migration 057 completed successfully' as result;
