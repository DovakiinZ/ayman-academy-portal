-- ============================================
-- RESTORE LESSON CONTENT TABLES
-- Migration: 039_restore_lesson_tables.sql
-- ============================================

-- 1. Lesson Sections
CREATE TABLE IF NOT EXISTS public.lesson_sections (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    lesson_id uuid REFERENCES public.lessons(id) ON DELETE CASCADE,
    title_ar text NOT NULL,
    title_en text,
    order_index int DEFAULT 0,
    created_at timestamptz DEFAULT now()
);

-- 2. Lesson Blocks (The missing table causing 404)
CREATE TABLE IF NOT EXISTS public.lesson_blocks (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    lesson_id uuid REFERENCES public.lessons(id) ON DELETE CASCADE,
    section_id uuid REFERENCES public.lesson_sections(id) ON DELETE SET NULL,
    type text NOT NULL CHECK (type IN ('rich_text','video','image','file','link','tip','warning','example','exercise','qa','equation')),
    title_ar text,
    title_en text,
    content_ar text,
    content_en text,
    url text,
    metadata jsonb DEFAULT '{}'::jsonb,
    order_index int DEFAULT 0,
    is_published boolean DEFAULT true,
    created_at timestamptz DEFAULT now()
);

-- Indexing for performance
CREATE INDEX IF NOT EXISTS idx_lesson_blocks_lesson_id ON public.lesson_blocks(lesson_id);
CREATE INDEX IF NOT EXISTS idx_lesson_blocks_section_id ON public.lesson_blocks(section_id);
CREATE INDEX IF NOT EXISTS idx_lesson_blocks_order ON public.lesson_blocks(order_index);

-- 3. Lesson Quizzes
CREATE TABLE IF NOT EXISTS public.lesson_quizzes (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    lesson_id uuid REFERENCES public.lessons(id) ON DELETE CASCADE UNIQUE,
    is_enabled boolean DEFAULT true,
    unlock_after_percent int DEFAULT 90,
    passing_score int DEFAULT 70,
    created_at timestamptz DEFAULT now()
);

-- 4. Quiz Questions
CREATE TABLE IF NOT EXISTS public.lesson_quiz_questions (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    quiz_id uuid REFERENCES public.lesson_quizzes(id) ON DELETE CASCADE,
    type text CHECK (type IN ('mcq','true_false','multi_select')),
    question_ar text NOT NULL,
    question_en text,
    options jsonb NOT NULL, 
    correct_answer jsonb NOT NULL,
    explanation_ar text,
    explanation_en text,
    order_index int DEFAULT 0,
    created_at timestamptz DEFAULT now()
);

-- 5. Enable RLS
ALTER TABLE public.lesson_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_quiz_questions ENABLE ROW LEVEL SECURITY;

-- 6. RLS Policies (Using check_user_role from migration 038)

-- Sections
DROP POLICY IF EXISTS "sections_read_all" ON public.lesson_sections;
DROP POLICY IF EXISTS "sections_manage_all" ON public.lesson_sections;
CREATE POLICY "sections_read_all" ON public.lesson_sections FOR SELECT USING (true);
CREATE POLICY "sections_manage_all" ON public.lesson_sections FOR ALL USING (check_user_role(ARRAY['super_admin', 'teacher']));

-- Blocks
DROP POLICY IF EXISTS "blocks_read_all" ON public.lesson_blocks;
DROP POLICY IF EXISTS "blocks_manage_all" ON public.lesson_blocks;
CREATE POLICY "blocks_read_all" ON public.lesson_blocks FOR SELECT USING (true);
CREATE POLICY "blocks_manage_all" ON public.lesson_blocks FOR ALL USING (check_user_role(ARRAY['super_admin', 'teacher']));

-- Quizzes
DROP POLICY IF EXISTS "quizzes_read_all" ON public.lesson_quizzes;
DROP POLICY IF EXISTS "quizzes_manage_all" ON public.lesson_quizzes;
CREATE POLICY "quizzes_read_all" ON public.lesson_quizzes FOR SELECT USING (true);
CREATE POLICY "quizzes_manage_all" ON public.lesson_quizzes FOR ALL USING (check_user_role(ARRAY['super_admin', 'teacher']));

-- Questions
DROP POLICY IF EXISTS "questions_read_all" ON public.lesson_quiz_questions;
DROP POLICY IF EXISTS "questions_manage_all" ON public.lesson_quiz_questions;
CREATE POLICY "questions_read_all" ON public.lesson_quiz_questions FOR SELECT USING (true);
CREATE POLICY "questions_manage_all" ON public.lesson_quiz_questions FOR ALL USING (check_user_role(ARRAY['super_admin', 'teacher']));
