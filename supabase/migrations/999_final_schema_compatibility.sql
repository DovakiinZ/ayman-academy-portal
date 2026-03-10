-- ============================================================================
-- 999_final_schema_compatibility.sql
-- Force alignment between Frontend and Database Schema
-- Resolves all known 400/406/404 errors by ensuring absolute column/table consistency
-- ============================================================================

-- 1. Ensure 'is_published' exists in all relevant tables and alias 'published' if it exists
DO $$ 
BEGIN
    -- Lessons
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lessons' AND column_name = 'published') THEN
        ALTER TABLE public.lessons RENAME COLUMN published TO is_published;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lessons' AND column_name = 'is_published') THEN
        ALTER TABLE public.lessons ADD COLUMN is_published boolean DEFAULT false;
    END IF;

    -- Courses
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'courses' AND column_name = 'published') THEN
        ALTER TABLE public.courses RENAME COLUMN published TO is_published;
    END IF;

    -- Create a VIEW or TRIGGER to handle 'published' query if it comes from a hardcoded library
    -- Actually, it's safer to just add the column if it's missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lessons' AND column_name = 'published') THEN
        ALTER TABLE public.lessons ADD COLUMN published boolean GENERATED ALWAYS AS (is_published) STORED;
    END IF;
END $$;

-- 2. Align Subjects table columns (is_active vs is_published)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subjects' AND column_name = 'is_active') THEN
        ALTER TABLE public.subjects ADD COLUMN is_active boolean DEFAULT true;
    END IF;
    
    -- Some old code might expect 'is_published' on subjects too
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subjects' AND column_name = 'is_published') THEN
        ALTER TABLE public.subjects ADD COLUMN is_published boolean GENERATED ALWAYS AS (is_active) STORED;
    END IF;
END $$;

-- 3. Restore/Verify Quiz Tables and Columns
CREATE TABLE IF NOT EXISTS public.lesson_quizzes (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    lesson_id uuid UNIQUE REFERENCES public.lessons(id) ON DELETE CASCADE,
    title text,
    is_required boolean DEFAULT false,
    passing_score integer DEFAULT 60,
    created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.lesson_quiz_questions (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    quiz_id uuid REFERENCES public.lesson_quizzes(id) ON DELETE CASCADE,
    lesson_id uuid REFERENCES public.lessons(id) ON DELETE CASCADE, -- Frontend expects this
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

-- 4. Fix RPCs to handle missing profile columns (student_stage)
-- If student_stage is missing, create it
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'student_stage') THEN
        ALTER TABLE public.profiles ADD COLUMN student_stage text;
    END IF;
END $$;

-- 5. Re-grant permissions
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO service_role;

-- 6. Add missing ID to subjects if missing
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subjects' AND column_name = 'teacher_id') THEN
        ALTER TABLE public.subjects ADD COLUMN teacher_id uuid REFERENCES public.profiles(id);
    END IF;
END $$;
