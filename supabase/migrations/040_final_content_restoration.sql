-- ============================================
-- NUCLEAR CONTENT & RLS RESTORATION
-- Migration: 040_final_content_restoration.sql
-- ============================================

-- 0. BREAK RLS RECURSION (Bulletproof)
-- This function is owned by postgres and bypasses RLS
CREATE OR REPLACE FUNCTION public.check_user_role(required_roles text[])
RETURNS boolean AS $$
DECLARE
  user_role text;
BEGIN
  -- Use a direct select that avoids triggering RLS by being SECURITY DEFINER
  SELECT role INTO user_role FROM public.profiles WHERE id = auth.uid();
  RETURN user_role = ANY(required_roles);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 1. CLEAN SLATE FOR CONTENT TABLES
-- Drop existing tables to resolve 404/Corrupted state
DROP TABLE IF EXISTS public.lesson_quiz_questions CASCADE;
DROP TABLE IF EXISTS public.lesson_quizzes CASCADE;
DROP TABLE IF EXISTS public.lesson_blocks CASCADE;
DROP TABLE IF EXISTS public.lesson_sections CASCADE;

-- 2. RE-CREATE TABLES
-- Sections
CREATE TABLE public.lesson_sections (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    lesson_id uuid REFERENCES public.lessons(id) ON DELETE CASCADE,
    title_ar text NOT NULL,
    title_en text,
    order_index int DEFAULT 0,
    created_at timestamptz DEFAULT now()
);

-- Blocks
CREATE TABLE public.lesson_blocks (
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

-- Quizzes
CREATE TABLE public.lesson_quizzes (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    lesson_id uuid REFERENCES public.lessons(id) ON DELETE CASCADE UNIQUE,
    is_enabled boolean DEFAULT true,
    unlock_after_percent int DEFAULT 90,
    passing_score int DEFAULT 70,
    created_at timestamptz DEFAULT now()
);

-- Quiz Questions
CREATE TABLE public.lesson_quiz_questions (
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

-- 3. ENABLE RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_quiz_questions ENABLE ROW LEVEL SECURITY;

-- 4. RECURSION-FREE POLICIES
-- Profiles
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "profiles_select_public" ON public.profiles;
    DROP POLICY IF EXISTS "profiles_self_manage" ON public.profiles;
    DROP POLICY IF EXISTS "profiles_admin_all" ON public.profiles;
END $$;

CREATE POLICY "profiles_select_public" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "profiles_self_manage" ON public.profiles FOR ALL USING (auth.uid() = id);
CREATE POLICY "profiles_admin_all" ON public.profiles FOR ALL USING (check_user_role(ARRAY['super_admin']));

-- Content Tables (Grant all to teachers/admins)
CREATE POLICY "sections_manage" ON public.lesson_sections FOR ALL USING (check_user_role(ARRAY['super_admin', 'teacher']));
CREATE POLICY "blocks_manage" ON public.lesson_blocks FOR ALL USING (check_user_role(ARRAY['super_admin', 'teacher']));
CREATE POLICY "quizzes_manage" ON public.lesson_quizzes FOR ALL USING (check_user_role(ARRAY['super_admin', 'teacher']));
CREATE POLICY "questions_manage" ON public.lesson_quiz_questions FOR ALL USING (check_user_role(ARRAY['super_admin', 'teacher']));

-- Read policies for students
CREATE POLICY "sections_read" ON public.lesson_sections FOR SELECT USING (true);
CREATE POLICY "blocks_read" ON public.lesson_blocks FOR SELECT USING (true);
CREATE POLICY "quizzes_read" ON public.lesson_quizzes FOR SELECT USING (true);
CREATE POLICY "questions_read" ON public.lesson_quiz_questions FOR SELECT USING (true);

-- 5. GRANTS (Force permissions)
GRANT ALL ON TABLE public.lesson_sections TO authenticated, service_role;
GRANT ALL ON TABLE public.lesson_blocks TO authenticated, service_role;
GRANT ALL ON TABLE public.lesson_quizzes TO authenticated, service_role;
GRANT ALL ON TABLE public.lesson_quiz_questions TO authenticated, service_role;
GRANT ALL ON TABLE public.profiles TO authenticated, service_role;
