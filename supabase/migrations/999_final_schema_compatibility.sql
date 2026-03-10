-- ============================================================================
-- 999_FINAL_DATABASE_SYNC.sql
-- Force alignment between Frontend and Database Schema
-- Resolves all known 400/406/404 errors by ensuring absolute consistency.
-- This script is IDEMPOTENT (safe to run multiple times).
-- ============================================================================

BEGIN;

-- 1. STAGES vs LEVELS (Ensure 'stages' table exists and is used)
CREATE TABLE IF NOT EXISTS public.stages (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    title_ar text NOT NULL,
    title_en text,
    slug text UNIQUE,
    sort_order integer DEFAULT 0,
    is_active boolean DEFAULT true,
    created_at timestamptz DEFAULT now()
);

-- 2. SUBJECTS TABLE ALIGNMENT
-- Ensure columns exist: stage_id, teacher_id, is_active, access_type, slug
DO $$ 
BEGIN
    -- Rename level_id to stage_id carefully
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subjects' AND column_name = 'level_id') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subjects' AND column_name = 'stage_id') THEN
            ALTER TABLE public.subjects RENAME COLUMN level_id TO stage_id;
        ELSE
            -- Both exist, sync data then drop old
            UPDATE public.subjects SET stage_id = level_id WHERE stage_id IS NULL;
            ALTER TABLE public.subjects DROP COLUMN level_id;
        END IF;
    END IF;

    -- Add missing columns
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subjects' AND column_name = 'stage_id') THEN
        ALTER TABLE public.subjects ADD COLUMN stage_id uuid REFERENCES public.stages(id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subjects' AND column_name = 'teacher_id') THEN
        ALTER TABLE public.subjects ADD COLUMN teacher_id uuid REFERENCES public.profiles(id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subjects' AND column_name = 'is_active') THEN
        ALTER TABLE public.subjects ADD COLUMN is_active boolean DEFAULT true;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subjects' AND column_name = 'access_type') THEN
        ALTER TABLE public.subjects ADD COLUMN access_type text DEFAULT 'stage';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subjects' AND column_name = 'slug') THEN
        ALTER TABLE public.subjects ADD COLUMN slug text;
    END IF;
END $$;

-- 3. LESSONS TABLE ALIGNMENT
-- Ensure columns exist: is_published, is_paid, order_index, subject_id, slug
DO $$ 
BEGIN
    -- Rename 'published' to 'is_published' carefully
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lessons' AND column_name = 'published') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lessons' AND column_name = 'is_published') THEN
            ALTER TABLE public.lessons RENAME COLUMN published TO is_published;
        ELSE
            -- Both exist, migration likely already happened or columns are redundant
            -- Sync data just in case then drop old
            UPDATE public.lessons SET is_published = published WHERE is_published IS NULL OR is_published = false;
            ALTER TABLE public.lessons DROP COLUMN published;
        END IF;
    END IF;

    -- Rename 'paid' to 'is_paid' carefully
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lessons' AND column_name = 'paid') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lessons' AND column_name = 'is_paid') THEN
            ALTER TABLE public.lessons RENAME COLUMN paid TO is_paid;
        ELSE
            UPDATE public.lessons SET is_paid = paid WHERE is_paid IS NULL;
            ALTER TABLE public.lessons DROP COLUMN paid;
        END IF;
    END IF;

    -- Add missing columns
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lessons' AND column_name = 'is_published') THEN
        ALTER TABLE public.lessons ADD COLUMN is_published boolean DEFAULT false;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lessons' AND column_name = 'is_paid') THEN
        ALTER TABLE public.lessons ADD COLUMN is_paid boolean DEFAULT true;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lessons' AND column_name = 'order_index') THEN
        ALTER TABLE public.lessons ADD COLUMN order_index integer DEFAULT 0;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lessons' AND column_name = 'subject_id') THEN
        ALTER TABLE public.lessons ADD COLUMN subject_id uuid REFERENCES public.subjects(id);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lessons' AND column_name = 'slug') THEN
        ALTER TABLE public.lessons ADD COLUMN slug text;
    END IF;

    -- Relax course_id constraint for modern subject-only lessons
    ALTER TABLE public.lessons ALTER COLUMN course_id DROP NOT NULL;
END $$;

-- 4. PROFILES TABLE ALIGNMENT
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'student_stage') THEN
        ALTER TABLE public.profiles ADD COLUMN student_stage text;
    END IF;
END $$;

-- 5. QUIZ TABLES (Restore if missing)
CREATE TABLE IF NOT EXISTS public.lesson_quizzes (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    lesson_id uuid UNIQUE REFERENCES public.lessons(id) ON DELETE CASCADE,
    title text,
    is_required boolean DEFAULT false,
    is_enabled boolean DEFAULT true,
    passing_score integer DEFAULT 60,
    created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.lesson_quiz_questions (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    quiz_id uuid REFERENCES public.lesson_quizzes(id) ON DELETE CASCADE,
    lesson_id uuid REFERENCES public.lessons(id) ON DELETE CASCADE,
    question_text_ar text NOT NULL,
    question_text_en text,
    options_ar jsonb NOT NULL DEFAULT '[]',
    options_en jsonb NOT NULL DEFAULT '[]',
    correct_option_index integer NOT NULL,
    explanation_ar text,
    explanation_en text,
    order_index integer DEFAULT 0,
    created_at timestamptz DEFAULT now()
);

-- 6. RPC: check_subject_access (Required for Student Portal)
CREATE OR REPLACE FUNCTION public.check_subject_access(p_student_id uuid, p_subject_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
    v_has_access boolean := false;
    v_role text;
BEGIN
    -- Admins and Teachers always have access
    SELECT role INTO v_role FROM profiles WHERE id = auth.uid();
    IF v_role IN ('super_admin', 'teacher') THEN
        RETURN jsonb_build_object('has_access', true, 'reason', 'privileged_role');
    END IF;

    -- Check if it's a public subject
    IF EXISTS (SELECT 1 FROM subjects WHERE id = p_subject_id AND access_type = 'public' AND is_active = true) THEN
        RETURN jsonb_build_object('has_access', true, 'reason', 'public');
    END IF;

    -- Check if it's the student's stage
    IF EXISTS (
        SELECT 1 FROM subjects s
        JOIN stages st ON s.stage_id = st.id
        JOIN profiles p ON p.id = p_student_id
        WHERE s.id = p_subject_id 
          AND st.slug = p.student_stage
          AND s.is_active = true
    ) THEN
        RETURN jsonb_build_object('has_access', true, 'reason', 'stage');
    END IF;

    RETURN jsonb_build_object('has_access', false, 'reason', 'not_entitled');
END;
$$;

-- 7. RPC: get_student_subjects (Required for Student Dashboard)
CREATE OR REPLACE FUNCTION public.get_student_subjects(p_student_id uuid)
RETURNS SETOF public.subjects
LANGUAGE sql SECURITY DEFINER
AS $$
    SELECT s.* FROM public.subjects s
    JOIN public.stages st ON s.stage_id = st.id
    JOIN public.profiles p ON p.id = p_student_id
    WHERE (st.slug = p.student_stage OR s.access_type = 'public')
      AND s.is_active = true
    ORDER BY s.sort_order ASC;
$$;

-- 8. FIX RLS POLICIES (Restore Student Access to Content)

-- LESSONS
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Lessons readable by students" ON public.lessons;
CREATE POLICY "Lessons readable by students" ON public.lessons
    FOR SELECT USING (is_published = true OR auth.uid() = created_by OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('super_admin', 'teacher')));

-- SUBJECTS
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Subjects readable by everyone" ON public.subjects;
CREATE POLICY "Subjects readable by everyone" ON public.subjects
    FOR SELECT USING (is_active = true OR teacher_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin'));

-- LESSON PROGRESS (Teacher Visibility Fix)
ALTER TABLE public.lesson_progress ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own progress" ON public.lesson_progress;
CREATE POLICY "Users manage own progress" ON public.lesson_progress FOR ALL USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Teachers view student progress" ON public.lesson_progress;
CREATE POLICY "Teachers view student progress" ON public.lesson_progress
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM lessons l
            JOIN subjects s ON l.subject_id = s.id
            WHERE l.id = lesson_progress.lesson_id AND s.teacher_id = auth.uid()
        )
    );

-- 9. PERMISSIONS
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO service_role;

-- 10. NOTIFY PostgREST
NOTIFY pgrst, 'reload schema';

COMMIT;
