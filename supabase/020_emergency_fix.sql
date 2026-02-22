-- ==============================================================================
-- 020 EMERGENCY RLS FIX
-- "Nothing is saving" -> This script FORCEFULLY fixes write access.
-- ==============================================================================

-- 1. FIX is_super_admin FUNCTION (CRITICAL)
-- Ensure it is SECURITY DEFINER so it can actually check the profiles table
-- even if RLS is blocking the user from seeing their own profile.

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER -- Bypass RLS for this function
SET search_path = public
AS $$
BEGIN
    -- Check if user has super_admin role
    RETURN EXISTS (
        SELECT 1 
        FROM public.profiles 
        WHERE id = auth.uid() 
        AND role = 'super_admin'
    );
END;
$$;

-- 2. FIX is_teacher FUNCTION
CREATE OR REPLACE FUNCTION public.is_teacher()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 
        FROM public.profiles 
        WHERE id = auth.uid() 
        AND role = 'teacher'
    );
END;
$$;

-- 3. ENABLE RLS ON ALL TABLES (Just to be sure configuration is consistent)
ALTER TABLE public.stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_content_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 4. DROP EXISTING POLICIES TO PREVENT CONFLICTS
-- We drop generic names to ensure we start fresh.

DROP POLICY IF EXISTS "stages_select_active" ON public.stages;
DROP POLICY IF EXISTS "stages_admin_all" ON public.stages;
DROP POLICY IF EXISTS "stages_admin_insert" ON public.stages;
DROP POLICY IF EXISTS "stages_admin_update" ON public.stages;
DROP POLICY IF EXISTS "stages_admin_delete" ON public.stages;

DROP POLICY IF EXISTS "subjects_select_active" ON public.subjects;
DROP POLICY IF EXISTS "subjects_admin_all" ON public.subjects;
DROP POLICY IF EXISTS "subjects_admin_insert" ON public.subjects;
DROP POLICY IF EXISTS "subjects_admin_update" ON public.subjects;
DROP POLICY IF EXISTS "subjects_admin_delete" ON public.subjects;

DROP POLICY IF EXISTS "lessons_select_published" ON public.lessons;
DROP POLICY IF EXISTS "lessons_admin_all" ON public.lessons;
DROP POLICY IF EXISTS "lessons_teacher_insert" ON public.lessons;
DROP POLICY IF EXISTS "lessons_teacher_update" ON public.lessons;
DROP POLICY IF EXISTS "lessons_teacher_delete" ON public.lessons;

DROP POLICY IF EXISTS "profiles_select_all" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
DROP POLICY IF EXISTS "profiles_admin_all" ON public.profiles;

-- 5. RE-CREATE POLICIES (SIMPLE & ROBUST)

-- STAGES
CREATE POLICY "stages_select" ON public.stages FOR SELECT USING (true); -- Public can read
CREATE POLICY "stages_all_admin" ON public.stages FOR ALL 
    USING (is_super_admin()) 
    WITH CHECK (is_super_admin());

-- SUBJECTS
CREATE POLICY "subjects_select" ON public.subjects FOR SELECT USING (true);
CREATE POLICY "subjects_all_admin" ON public.subjects FOR ALL 
    USING (is_super_admin()) 
    WITH CHECK (is_super_admin());

-- LESSONS
CREATE POLICY "lessons_select" ON public.lessons FOR SELECT USING (true);
CREATE POLICY "lessons_all_admin" ON public.lessons FOR ALL 
    USING (is_super_admin()) 
    WITH CHECK (is_super_admin());
-- Teacher permissions
CREATE POLICY "lessons_teacher_insert" ON public.lessons FOR INSERT 
    WITH CHECK (is_teacher() AND created_by = auth.uid());
CREATE POLICY "lessons_teacher_update" ON public.lessons FOR UPDATE 
    USING (is_teacher() AND created_by = auth.uid())
    WITH CHECK (is_teacher() AND created_by = auth.uid());

-- PROFILES (CRITICAL FOR AUTH)
-- Allow everyone to read profiles (needed for login checks sometimes if logic is client-side)
CREATE POLICY "profiles_select_all" ON public.profiles FOR SELECT USING (true);
-- Allow everyone to insert their own profile (Signup)
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
-- Allow users to update their own profile
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE USING (auth.uid() = id);
-- Super admin can do everything
CREATE POLICY "profiles_admin_all" ON public.profiles FOR ALL 
    USING (is_super_admin()) 
    WITH CHECK (is_super_admin());

-- 6. GRANT PERMISSIONS (Just in case)
GRANT ALL ON TABLE public.stages TO authenticated;
GRANT ALL ON TABLE public.subjects TO authenticated;
GRANT ALL ON TABLE public.lessons TO authenticated;
GRANT ALL ON TABLE public.profiles TO authenticated;
GRANT ALL ON TABLE public.profiles TO service_role;
