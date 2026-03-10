BEGIN;

-- 1. FIX LESSONS RLS (Allow everyone to see published lessons)
DROP POLICY IF EXISTS "Lessons are viewable by everyone" ON public.lessons;
DROP POLICY IF EXISTS "lessons_select_published" ON public.lessons;
CREATE POLICY "lessons_select_published" ON public.lessons
    FOR SELECT USING (
        is_published = true 
        OR auth.uid() = created_by 
        OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('teacher', 'super_admin'))
    );

-- 2. FIX SUBJECTS RLS (Allow everyone to see active subjects)
DROP POLICY IF EXISTS "Subjects are viewable by everyone" ON public.subjects;
DROP POLICY IF EXISTS "subjects_select_active" ON public.subjects;
CREATE POLICY "subjects_select_active" ON public.subjects
    FOR SELECT USING (
        is_active = true 
        OR teacher_id = auth.uid() 
        OR EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
    );

-- 3. ENSURE CONTENT TABLES ARE READABLE
-- Lesson Sections
ALTER TABLE public.lesson_sections ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "sections_read_all" ON public.lesson_sections;
CREATE POLICY "sections_read_all" ON public.lesson_sections FOR SELECT USING (true);

-- Lesson Blocks
ALTER TABLE public.lesson_blocks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "blocks_read_all" ON public.lesson_blocks;
CREATE POLICY "blocks_read_all" ON public.lesson_blocks FOR SELECT USING (true);

-- Lesson Quizzes
ALTER TABLE public.lesson_quizzes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "quizzes_read_all" ON public.lesson_quizzes;
CREATE POLICY "quizzes_read_all" ON public.lesson_quizzes FOR SELECT USING (true);

-- Quiz Questions
ALTER TABLE public.lesson_quiz_questions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "questions_read_all" ON public.lesson_quiz_questions;
CREATE POLICY "questions_read_all" ON public.lesson_quiz_questions FOR SELECT USING (true);

-- 4. RELOAD SCHEMA CACHE
NOTIFY pgrst, 'reload schema';

COMMIT;
