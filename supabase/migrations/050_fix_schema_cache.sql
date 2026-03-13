-- 050_fix_schema_cache.sql
-- This script fixes missing Foreign Key relationships in PostgREST schema cache
-- by explicitly granting privileges to authenticated and anon roles,
-- re-asserting the foreign keys, and forcing a schema reload.

-- 1. Ensure the schema itself is fully accessible
GRANT USAGE ON SCHEMA public TO anon, authenticated;

-- 2. Grant all privileges on all newly recreated tables to ensure PostgREST exposes them
GRANT ALL ON TABLE public.lessons TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.lesson_sections TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.lesson_blocks TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.lesson_quizzes TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.lesson_quiz_questions TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.subjects TO anon, authenticated, service_role;
GRANT ALL ON TABLE public.stages TO anon, authenticated, service_role;

-- 3. Cleanup orphaned records before re-asserting foreign keys
-- 3. Cleanup orphaned records before re-asserting foreign keys
DELETE FROM public.lesson_sections WHERE NOT EXISTS (SELECT 1 FROM public.lessons WHERE id = lesson_sections.lesson_id);
DELETE FROM public.lesson_blocks WHERE NOT EXISTS (SELECT 1 FROM public.lessons WHERE id = lesson_blocks.lesson_id);
UPDATE public.lesson_blocks SET section_id = NULL WHERE section_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.lesson_sections WHERE id = lesson_blocks.section_id);
DELETE FROM public.lesson_quizzes WHERE NOT EXISTS (SELECT 1 FROM public.lessons WHERE id = lesson_quizzes.lesson_id);
DELETE FROM public.lesson_quiz_questions WHERE NOT EXISTS (SELECT 1 FROM public.lesson_quizzes WHERE id = lesson_quiz_questions.quiz_id);

-- 4. Re-assert foreign keys explicitly (to forcefully rebuild constraint metadata)
ALTER TABLE public.lesson_sections DROP CONSTRAINT IF EXISTS lesson_sections_lesson_id_fkey;
ALTER TABLE public.lesson_sections ADD CONSTRAINT lesson_sections_lesson_id_fkey FOREIGN KEY (lesson_id) REFERENCES public.lessons(id) ON DELETE CASCADE;

ALTER TABLE public.lesson_blocks DROP CONSTRAINT IF EXISTS lesson_blocks_lesson_id_fkey;
ALTER TABLE public.lesson_blocks ADD CONSTRAINT lesson_blocks_lesson_id_fkey FOREIGN KEY (lesson_id) REFERENCES public.lessons(id) ON DELETE CASCADE;
ALTER TABLE public.lesson_blocks DROP CONSTRAINT IF EXISTS lesson_blocks_section_id_fkey;
ALTER TABLE public.lesson_blocks ADD CONSTRAINT lesson_blocks_section_id_fkey FOREIGN KEY (section_id) REFERENCES public.lesson_sections(id) ON DELETE SET NULL;

ALTER TABLE public.lesson_quizzes DROP CONSTRAINT IF EXISTS lesson_quizzes_lesson_id_fkey;
ALTER TABLE public.lesson_quizzes ADD CONSTRAINT lesson_quizzes_lesson_id_fkey FOREIGN KEY (lesson_id) REFERENCES public.lessons(id) ON DELETE CASCADE;

ALTER TABLE public.lesson_quiz_questions DROP CONSTRAINT IF EXISTS lesson_quiz_questions_quiz_id_fkey;
ALTER TABLE public.lesson_quiz_questions ADD CONSTRAINT lesson_quiz_questions_quiz_id_fkey FOREIGN KEY (quiz_id) REFERENCES public.lesson_quizzes(id) ON DELETE CASCADE;

-- 5. Tell PostgREST to immediately rebuild its schema cache
NOTIFY pgrst, 'reload schema';

-- 6. Force a generic change to trigger Dashboard cache invalidation just in case
COMMENT ON TABLE public.lesson_sections IS 'Schema cache rebuilt';
COMMENT ON TABLE public.lesson_blocks IS 'Schema cache rebuilt';
