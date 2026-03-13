-- Grant permissions to both anon and authenticated to ensure PostgREST exposes the relationships correctly
GRANT ALL ON TABLE public.lessons TO authenticated, anon, service_role;
GRANT ALL ON TABLE public.lesson_sections TO authenticated, anon, service_role;
GRANT ALL ON TABLE public.lesson_blocks TO authenticated, anon, service_role;
GRANT ALL ON TABLE public.lesson_quizzes TO authenticated, anon, service_role;
GRANT ALL ON TABLE public.lesson_quiz_questions TO authenticated, anon, service_role;
GRANT ALL ON TABLE public.subjects TO authenticated, anon, service_role;
GRANT ALL ON TABLE public.stages TO authenticated, anon, service_role;

-- ensure usage on schema
GRANT USAGE ON SCHEMA public TO anon, authenticated;

-- Force postgrest cache reload by commenting on the table
COMMENT ON TABLE public.lesson_sections IS 'Forces a schema cache reload ' || now();
