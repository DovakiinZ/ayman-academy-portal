-- ==============================================================================
-- 999_FINAL_ALL_IN_ONE_FIX.sql
-- CRITICAL: RUN THIS ONCE TO FIX EVERYTHING
-- Includes: Metadata, Slug Constraints, Storage RLS, Lesson Schema, and Quiz Schema
-- ==============================================================================

BEGIN;

-- 1. SUBJECTS & PROFILES METADATA (from 055)
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subjects' AND column_name = 'description_ar') THEN
        ALTER TABLE public.subjects ADD COLUMN description_ar TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subjects' AND column_name = 'access_type') THEN
        ALTER TABLE public.subjects ADD COLUMN access_type TEXT NOT NULL DEFAULT 'stage';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subjects' AND column_name = 'teacher_id') THEN
        ALTER TABLE public.subjects ADD COLUMN teacher_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'qualifications') THEN
        ALTER TABLE public.profiles ADD COLUMN qualifications TEXT;
    END IF;
END $$;

-- 2. RELAX SLUG CONSTRAINTS (from 056)
ALTER TABLE public.subjects ALTER COLUMN slug DROP NOT NULL;
ALTER TABLE public.courses ALTER COLUMN slug DROP NOT NULL;

-- 3. STORAGE RLS FIX (from 056)
-- Ensure bucket exists
INSERT INTO storage.buckets (id, name, public) 
VALUES ('avatars', 'avatars', true) 
ON CONFLICT (id) DO NOTHING;

-- Policy for users to manage their own folder: userId/...
DROP POLICY IF EXISTS "Users can manage own folder" ON storage.objects;
CREATE POLICY "Users can manage own folder" ON storage.objects 
FOR ALL USING (
    bucket_id = 'avatars' AND 
    (storage.foldername(name))[1] = auth.uid()::text
) WITH CHECK (
    bucket_id = 'avatars' AND 
    (storage.foldername(name))[1] = auth.uid()::text
);

-- 4. LESSON SCHEMA FIX (from 057)
DO $$ 
BEGIN 
    -- Ensure core columns exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lessons' AND column_name = 'slug') THEN
        ALTER TABLE public.lessons ADD COLUMN slug TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lessons' AND column_name = 'order_index') THEN
        ALTER TABLE public.lessons ADD COLUMN order_index INT DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lessons' AND column_name = 'is_paid') THEN
        ALTER TABLE public.lessons ADD COLUMN is_paid BOOLEAN DEFAULT true;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lessons' AND column_name = 'is_published') THEN
        ALTER TABLE public.lessons ADD COLUMN is_published BOOLEAN DEFAULT false;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lessons' AND column_name = 'created_by') THEN
        ALTER TABLE public.lessons ADD COLUMN created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lessons' AND column_name = 'subject_id') THEN
        ALTER TABLE public.lessons ADD COLUMN subject_id UUID REFERENCES public.subjects(id) ON DELETE CASCADE;
    END IF;

    -- Relax course_id requirement
    BEGIN
        ALTER TABLE public.lessons ALTER COLUMN course_id DROP NOT NULL;
    EXCEPTION WHEN OTHERS THEN NULL; END;

    -- Update Unique Constraint
    ALTER TABLE public.lessons DROP CONSTRAINT IF EXISTS lessons_course_id_slug_key;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'lessons_subject_id_slug_key') THEN
        ALTER TABLE public.lessons ADD CONSTRAINT lessons_subject_id_slug_key UNIQUE (subject_id, slug);
    END IF;
END $$;

-- 5. QUIZ SCHEMA RESTORE (from 058)
CREATE TABLE IF NOT EXISTS public.lesson_quizzes (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    lesson_id uuid REFERENCES public.lessons(id) ON DELETE CASCADE UNIQUE,
    is_enabled boolean DEFAULT true,
    unlock_after_percent int DEFAULT 90,
    passing_score int DEFAULT 70,
    created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.lesson_quiz_questions (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    quiz_id uuid REFERENCES public.lesson_quizzes(id) ON DELETE CASCADE,
    type text CHECK (type IN ('mcq','true_false','multi_select')),
    question_ar text NOT NULL,
    question_en text,
    options jsonb NOT NULL DEFAULT '[]'::jsonb,
    correct_answer jsonb NOT NULL DEFAULT '""'::jsonb,
    explanation_ar text,
    explanation_en text,
    order_index int DEFAULT 0,
    created_at timestamptz DEFAULT now()
);

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lesson_quiz_questions' AND column_name = 'lesson_id') THEN
        ALTER TABLE public.lesson_quiz_questions ADD COLUMN lesson_id uuid REFERENCES public.lessons(id) ON DELETE CASCADE;
    END IF;
END $$;

-- 6. CONSOLIDATED RLS POLICIES
-- Subjects
DROP POLICY IF EXISTS "Teachers can manage own subjects" ON public.subjects;
CREATE POLICY "Teachers can manage own subjects" ON public.subjects FOR ALL 
USING (teacher_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin'));

-- Lessons
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Teachers can manage own lessons" ON public.lessons;
CREATE POLICY "Teachers can manage own lessons" ON public.lessons FOR ALL 
USING (created_by = auth.uid() OR EXISTS (SELECT 1 FROM subjects s WHERE s.id = lessons.subject_id AND s.teacher_id = auth.uid()) OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin'));

-- Quizzes
ALTER TABLE public.lesson_quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_quiz_questions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "quizzes_manage_all" ON public.lesson_quizzes;
CREATE POLICY "quizzes_manage_all" ON public.lesson_quizzes FOR ALL 
USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('super_admin', 'teacher')));

DROP POLICY IF EXISTS "questions_manage_all" ON public.lesson_quiz_questions;
CREATE POLICY "questions_manage_all" ON public.lesson_quiz_questions FOR ALL 
USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('super_admin', 'teacher')));

-- 7. CACHE RELOAD
NOTIFY pgrst, 'reload schema';

COMMIT;
