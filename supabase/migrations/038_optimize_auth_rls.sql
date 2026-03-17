-- ============================================
-- OPTIMIZE AUTH & CONTENT RLS (RECURSION FIX)
-- Migration: 038_optimize_auth_rls.sql
-- ============================================

-- 0. Helper function to break recursion in RLS
-- This function runs with "SECURITY DEFINER" (permissions of the creator, i.e., admin)
-- allowing it to bypass RLS when checking a user's role.
CREATE OR REPLACE FUNCTION public.check_user_role(required_roles text[])
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid()
    AND role = ANY(required_roles)
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 1. Optimize PROFILES RLS (Remove recursion)
DROP POLICY IF EXISTS "profiles_admin_all" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_all" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;

-- Allow users to manage their own profiles
CREATE POLICY "profiles_self_manage" ON public.profiles 
FOR ALL USING (auth.uid() = id);

-- Allow public readability (needed for many UI features)
CREATE POLICY "profiles_select_public" ON public.profiles 
FOR SELECT USING (true);

-- Admin override using the recursion-breaking function
CREATE POLICY "profiles_admin_all" ON public.profiles 
FOR ALL USING (check_user_role(ARRAY['super_admin']));

-- 2. Optimize LESSON_SECTIONS RLS
DROP POLICY IF EXISTS "Admins/Teachers manage sections" ON public.lesson_sections;
DROP POLICY IF EXISTS "Public read published sections" ON public.lesson_sections;

CREATE POLICY "sections_read_all" ON public.lesson_sections FOR SELECT USING (true);
CREATE POLICY "sections_manage_all" ON public.lesson_sections FOR ALL USING (
    check_user_role(ARRAY['super_admin', 'teacher'])
);

-- 3. Optimize LESSON_BLOCKS RLS
DROP POLICY IF EXISTS "Admins/Teachers manage blocks" ON public.lesson_blocks;
DROP POLICY IF EXISTS "Public read published blocks" ON public.lesson_blocks;

CREATE POLICY "blocks_read_all" ON public.lesson_blocks FOR SELECT USING (true);
CREATE POLICY "blocks_manage_all" ON public.lesson_blocks FOR ALL USING (
    check_user_role(ARRAY['super_admin', 'teacher'])
);

-- 4. Optimize LESSON_QUIZZES RLS
DROP POLICY IF EXISTS "Admins/Teachers manage quizzes" ON public.lesson_quizzes;
DROP POLICY IF EXISTS "Public read quizzes" ON public.lesson_quizzes;

CREATE POLICY "quizzes_read_all" ON public.lesson_quizzes FOR SELECT USING (true);
CREATE POLICY "quizzes_manage_all" ON public.lesson_quizzes FOR ALL USING (
    check_user_role(ARRAY['super_admin', 'teacher'])
);

-- 5. Optimize LESSON_QUESTIONS RLS
DROP POLICY IF EXISTS "Admins/Teachers manage questions" ON public.lesson_quiz_questions;
DROP POLICY IF EXISTS "Public read questions" ON public.lesson_quiz_questions;

CREATE POLICY "questions_read_all" ON public.lesson_quiz_questions FOR SELECT USING (true);
CREATE POLICY "questions_manage_all" ON public.lesson_quiz_questions FOR ALL USING (
    check_user_role(ARRAY['super_admin', 'teacher'])
);

-- 6. Ensure LESSONS table is properly accessible
DROP POLICY IF EXISTS "lessons_admin_all" ON public.lessons;
CREATE POLICY "lessons_admin_all" ON public.lessons FOR ALL USING (
    check_user_role(ARRAY['super_admin'])
);

-- 7. Ensure SUBJECTS & STAGES are manageable
DROP POLICY IF EXISTS "subjects_admin_all" ON public.subjects;
CREATE POLICY "subjects_admin_all" ON public.subjects FOR ALL USING (
    check_user_role(ARRAY['super_admin'])
);

DROP POLICY IF EXISTS "stages_admin_all" ON public.stages;
CREATE POLICY "stages_admin_all" ON public.stages FOR ALL USING (
    check_user_role(ARRAY['super_admin'])
);
