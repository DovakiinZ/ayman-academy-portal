-- ==============================================================================
-- 058_fix_quiz_schema.sql
-- Fixes "relation lesson_quizzes does not exist" and missing columns.
-- ensures lesson_quiz_questions has lesson_id as expected by the frontend.
-- ==============================================================================

DO $$ 
BEGIN
    -- 1. Lesson Quizzes Table
    CREATE TABLE IF NOT EXISTS public.lesson_quizzes (
        id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
        lesson_id uuid REFERENCES public.lessons(id) ON DELETE CASCADE UNIQUE,
        is_enabled boolean DEFAULT true,
        unlock_after_percent int DEFAULT 90,
        passing_score int DEFAULT 70,
        created_at timestamptz DEFAULT now()
    );

    -- 2. Quiz Questions Table
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

    -- 3. Add missing lesson_id to quiz questions (used by frontend for easy access)
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lesson_quiz_questions' AND column_name = 'lesson_id') THEN
        ALTER TABLE public.lesson_quiz_questions ADD COLUMN lesson_id uuid REFERENCES public.lessons(id) ON DELETE CASCADE;
    END IF;

    -- 4. Enable RLS
    ALTER TABLE public.lesson_quizzes ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.lesson_quiz_questions ENABLE ROW LEVEL SECURITY;

    -- 5. RLS Policies
    -- Drop existing to avoid conflicts
    DROP POLICY IF EXISTS "quizzes_read_all" ON public.lesson_quizzes;
    DROP POLICY IF EXISTS "quizzes_manage_all" ON public.lesson_quizzes;
    DROP POLICY IF EXISTS "questions_read_all" ON public.lesson_quiz_questions;
    DROP POLICY IF EXISTS "questions_manage_all" ON public.lesson_quiz_questions;

    -- Helper check (fallback if check_user_role is missing, but it should be there)
    -- We'll use a direct check for robustness
    
    CREATE POLICY "quizzes_read_all" ON public.lesson_quizzes 
        FOR SELECT USING (true);
        
    CREATE POLICY "quizzes_manage_all" ON public.lesson_quizzes 
        FOR ALL USING (
            EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('super_admin', 'teacher'))
        );

    CREATE POLICY "questions_read_all" ON public.lesson_quiz_questions 
        FOR SELECT USING (true);
        
    CREATE POLICY "questions_manage_all" ON public.lesson_quiz_questions 
        FOR ALL USING (
            EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('super_admin', 'teacher'))
        );

    -- 6. Reload cache
    NOTIFY pgrst, 'reload schema';

END $$;

SELECT 'Migration 058 completed successfully' as result;
