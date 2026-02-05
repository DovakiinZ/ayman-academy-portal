-- ==============================================================================
-- 021_ADMIN_PERSISTENCE_OVERHAUL.sql
-- "Saved. Period." - Enforcing Database Integrity & Access Control
-- ==============================================================================

-- 1. UTILITY FUNCTIONS (Ensure they exist and are robust)
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND role = 'super_admin'
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.is_teacher()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND role = 'teacher'
    );
END;
$$;

CREATE OR REPLACE FUNCTION public.is_student()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() AND role = 'student'
    );
END;
$$;

-- 2. ENFORCE FOREIGN KEYS & RELATIONS (ON DELETE CASCADE)
-- ==============================================================================

-- Fix SUBJECTS -> STAGES
ALTER TABLE public.subjects
DROP CONSTRAINT IF EXISTS subjects_stage_id_fkey;

ALTER TABLE public.subjects
ADD CONSTRAINT subjects_stage_id_fkey
FOREIGN KEY (stage_id) REFERENCES public.stages(id)
ON DELETE CASCADE;

-- Fix LESSONS -> SUBJECTS
ALTER TABLE public.lessons
DROP CONSTRAINT IF EXISTS lessons_subject_id_fkey;

ALTER TABLE public.lessons
ADD CONSTRAINT lessons_subject_id_fkey
FOREIGN KEY (subject_id) REFERENCES public.subjects(id)
ON DELETE CASCADE;

-- Fix CONTENT ITEMS -> LESSONS
ALTER TABLE public.lesson_content_items
DROP CONSTRAINT IF EXISTS lesson_content_items_lesson_id_fkey;

ALTER TABLE public.lesson_content_items
ADD CONSTRAINT lesson_content_items_lesson_id_fkey
FOREIGN KEY (lesson_id) REFERENCES public.lessons(id)
ON DELETE CASCADE;

-- 3. RESET RLS POLICIES (Aggressive Cleanup)
-- ==============================================================================

ALTER TABLE public.stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_content_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Drop ALL conflicting policies
DROP POLICY IF EXISTS "stages_select_active" ON public.stages;
DROP POLICY IF EXISTS "stages_select" ON public.stages;
DROP POLICY IF EXISTS "stages_admin_all" ON public.stages;
DROP POLICY IF EXISTS "stages_all_admin" ON public.stages;

DROP POLICY IF EXISTS "subjects_select_active" ON public.subjects;
DROP POLICY IF EXISTS "subjects_select" ON public.subjects;
DROP POLICY IF EXISTS "subjects_admin_all" ON public.subjects;
DROP POLICY IF EXISTS "subjects_all_admin" ON public.subjects;

DROP POLICY IF EXISTS "lessons_select_published" ON public.lessons;
DROP POLICY IF EXISTS "lessons_select" ON public.lessons;
DROP POLICY IF EXISTS "lessons_admin_all" ON public.lessons;
DROP POLICY IF EXISTS "lessons_all_admin" ON public.lessons;
DROP POLICY IF EXISTS "lessons_teacher_crud" ON public.lessons;
DROP POLICY IF EXISTS "lessons_teacher_insert" ON public.lessons;
DROP POLICY IF EXISTS "lessons_teacher_update" ON public.lessons;
DROP POLICY IF EXISTS "lessons_teacher_delete" ON public.lessons;

-- 4. APPLY "STRICT PERSISTENCE" POLICIES
-- ==============================================================================

-- A. STAGES
-- Public Read (Selection)
CREATE POLICY "stages_read_all" ON public.stages FOR SELECT USING (true);
-- Super Admin CRUD
CREATE POLICY "stages_admin_crud" ON public.stages FOR ALL 
USING (is_super_admin()) WITH CHECK (is_super_admin());


-- B. SUBJECTS
-- Public Read (Selection)
CREATE POLICY "subjects_read_all" ON public.subjects FOR SELECT USING (true);
-- Super Admin CRUD
CREATE POLICY "subjects_admin_crud" ON public.subjects FOR ALL 
USING (is_super_admin()) WITH CHECK (is_super_admin());


-- C. LESSONS
-- Public Read (Published Only? Use simple read for now, filtering usually done in frontend/query)
-- Actually, strict requirement: "student: SELECT only published"
CREATE POLICY "lessons_read_published" ON public.lessons FOR SELECT 
USING (
    is_super_admin() 
    OR is_teacher() 
    OR is_published = true
);
-- Super Admin CRUD
CREATE POLICY "lessons_admin_crud" ON public.lessons FOR ALL 
USING (is_super_admin()) WITH CHECK (is_super_admin());
-- Teacher CRUD (Own Lessons)
CREATE POLICY "lessons_teacher_insert" ON public.lessons FOR INSERT 
WITH CHECK (is_teacher() AND created_by = auth.uid());

CREATE POLICY "lessons_teacher_modify" ON public.lessons FOR UPDATE
USING (is_teacher() AND created_by = auth.uid())
WITH CHECK (is_teacher() AND created_by = auth.uid());

CREATE POLICY "lessons_teacher_delete" ON public.lessons FOR DELETE
USING (is_teacher() AND created_by = auth.uid());


-- D. PROFILES (Required for Auth to work)
DROP POLICY IF EXISTS "profiles_select_all" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_admin_all" ON public.profiles;

CREATE POLICY "profiles_select_all" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "profiles_admin_all" ON public.profiles FOR ALL 
USING (is_super_admin()) WITH CHECK (is_super_admin());

-- 5. FINAL PERMISSIONS GRANT
-- ==============================================================================
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
