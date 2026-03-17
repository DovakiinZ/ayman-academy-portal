-- ==============================================================================
-- EMERGENCY FIX: ENSURE TEACHER PROFILE COLUMNS EXIST & RELOAD SCHEMA CACHE
-- Run this in the Supabase SQL Editor if you see "column not found" errors.
-- ==============================================================================

-- 1. Ensure Columns Exist in public.profiles
DO $$ 
BEGIN 
    -- Expertise Tags
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'expertise_tags_ar') THEN
        ALTER TABLE public.profiles ADD COLUMN expertise_tags_ar TEXT[] DEFAULT '{}';
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'expertise_tags_en') THEN
        ALTER TABLE public.profiles ADD COLUMN expertise_tags_en TEXT[] DEFAULT '{}';
    END IF;

    -- Featured Stages
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'featured_stages') THEN
        ALTER TABLE public.profiles ADD COLUMN featured_stages UUID[] DEFAULT '{}';
    END IF;

    -- Bio and Home Settings (Just in case)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'bio_ar') THEN
        ALTER TABLE public.profiles ADD COLUMN bio_ar TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'bio_en') THEN
        ALTER TABLE public.profiles ADD COLUMN bio_en TEXT;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'show_on_home') THEN
        ALTER TABLE public.profiles ADD COLUMN show_on_home BOOLEAN DEFAULT false;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'home_order') THEN
        ALTER TABLE public.profiles ADD COLUMN home_order INT DEFAULT 0;
    END IF;

END $$;

-- 2. Ensure Storage Bucket Exists
INSERT INTO storage.buckets (id, name, public)
SELECT 'avatars', 'avatars', true
WHERE NOT EXISTS (
    SELECT 1 FROM storage.buckets WHERE id = 'avatars'
);

-- 3. Storage RLS Policies (Safe creation)
DO $$ 
BEGIN 
    -- Public View
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Avatar Public View' AND tablename = 'objects' AND schemaname = 'storage') THEN
        CREATE POLICY "Avatar Public View" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');
    END IF;

    -- Self Upload
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Avatar Self Upload' AND tablename = 'objects' AND schemaname = 'storage') THEN
        CREATE POLICY "Avatar Self Upload" ON storage.objects FOR INSERT TO authenticated 
        WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
    END IF;

    -- Self Manage
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Avatar Self Manage' AND tablename = 'objects' AND schemaname = 'storage') THEN
        CREATE POLICY "Avatar Self Manage" ON storage.objects FOR UPDATE TO authenticated 
        USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text)
        WITH CHECK (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
    END IF;

    -- Self Delete
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Avatar Self Delete' AND tablename = 'objects' AND schemaname = 'storage') THEN
        CREATE POLICY "Avatar Self Delete" ON storage.objects FOR DELETE TO authenticated 
        USING (bucket_id = 'avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
    END IF;

    -- Admin Manage (Allows super_admin to manage any avatar)
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Avatar Admin Manage' AND tablename = 'objects' AND schemaname = 'storage') THEN
        CREATE POLICY "Avatar Admin Manage" ON storage.objects FOR ALL TO authenticated 
        USING (
            bucket_id = 'avatars' AND 
            (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin'))
        )
        WITH CHECK (
            bucket_id = 'avatars' AND 
            (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin'))
        );
    END IF;
END $$;

-- 4. Ensure Quiz Tables Schema
DO $$ 
BEGIN 
    -- lesson_quizzes columns
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'lesson_quizzes' AND column_name = 'is_enabled') THEN
        ALTER TABLE public.lesson_quizzes ADD COLUMN is_enabled BOOLEAN DEFAULT true;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'lesson_quizzes' AND column_name = 'unlock_after_percent') THEN
        ALTER TABLE public.lesson_quizzes ADD COLUMN unlock_after_percent INT DEFAULT 90;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'lesson_quizzes' AND column_name = 'passing_score') THEN
        ALTER TABLE public.lesson_quizzes ADD COLUMN passing_score INT DEFAULT 70;
    END IF;

    -- lesson_quiz_questions columns
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'lesson_quiz_questions' AND column_name = 'type') THEN
        ALTER TABLE public.lesson_quiz_questions ADD COLUMN type TEXT DEFAULT 'mcq';
    END IF;
    
    -- Rename/Add question_ar
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'lesson_quiz_questions' AND column_name = 'question_ar') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'lesson_quiz_questions' AND column_name = 'question_text_ar') THEN
            ALTER TABLE public.lesson_quiz_questions RENAME COLUMN question_text_ar TO question_ar;
        ELSE
            ALTER TABLE public.lesson_quiz_questions ADD COLUMN question_ar TEXT NOT NULL DEFAULT '';
        END IF;
    END IF;

    -- Rename/Add question_en
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'lesson_quiz_questions' AND column_name = 'question_en') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'lesson_quiz_questions' AND column_name = 'question_text_en') THEN
            ALTER TABLE public.lesson_quiz_questions RENAME COLUMN question_text_en TO question_en;
        ELSE
            ALTER TABLE public.lesson_quiz_questions ADD COLUMN question_en TEXT;
        END IF;
    END IF;

    -- options handle
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'lesson_quiz_questions' AND column_name = 'options') THEN
        ALTER TABLE public.lesson_quiz_questions ADD COLUMN options JSONB DEFAULT '[]'::jsonb;
    END IF;

    -- correct_answer handle
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'lesson_quiz_questions' AND column_name = 'correct_answer') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'lesson_quiz_questions' AND column_name = 'correct_option_index') THEN
            ALTER TABLE public.lesson_quiz_questions ADD COLUMN correct_answer JSONB;
            UPDATE public.lesson_quiz_questions SET correct_answer = to_jsonb(correct_option_index);
        ELSE
            ALTER TABLE public.lesson_quiz_questions ADD COLUMN correct_answer JSONB;
        END IF;
    END IF;

    -- order_index
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'lesson_quiz_questions' AND column_name = 'order_index') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'lesson_quiz_questions' AND column_name = 'sort_order') THEN
            ALTER TABLE public.lesson_quiz_questions RENAME COLUMN sort_order TO order_index;
        ELSE
            ALTER TABLE public.lesson_quiz_questions ADD COLUMN order_index INT DEFAULT 0;
        END IF;
    END IF;

END $$;

-- 5. Force PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';

-- 5. Success Message
SELECT 'Schema check, bucket creation, RLS setup, and cache reload completed successfully' as result;
