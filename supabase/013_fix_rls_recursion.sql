-- ==============================================================================
-- 013 FIX RLS RECURSION
-- Fixes infinite recursion caused by querying 'profiles' within RLS policies
-- ==============================================================================

-- 1. Create a SECURITY DEFINER function to check admin status
-- This function runs with the privileges of the creator (postgres/superuser),
-- effectively bypassing RLS when it queries the profiles table.
CREATE OR REPLACE FUNCTION public.is_super_admin()
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
        AND role = 'super_admin'
    );
END;
$$;

-- 2. Drop recursive policies
DROP POLICY IF EXISTS "profiles_admin_all" ON public.profiles;
DROP POLICY IF EXISTS "stages_admin_all" ON public.stages;
DROP POLICY IF EXISTS "subjects_admin_all" ON public.subjects;
DROP POLICY IF EXISTS "lessons_admin_all" ON public.lessons;
DROP POLICY IF EXISTS "content_admin_all" ON public.lesson_content_items;
DROP POLICY IF EXISTS "settings_admin_write" ON public.system_settings;
DROP POLICY IF EXISTS "templates_admin_write" ON public.content_templates;

-- 3. Re-create policies using the safe function

-- PROFILES
CREATE POLICY "profiles_admin_all" ON public.profiles FOR ALL USING (
    is_super_admin()
);

-- STAGES
CREATE POLICY "stages_admin_all" ON public.stages FOR ALL USING (
    is_super_admin()
);

-- SUBJECTS
CREATE POLICY "subjects_admin_all" ON public.subjects FOR ALL USING (
    is_super_admin()
);

-- LESSONS
CREATE POLICY "lessons_admin_all" ON public.lessons FOR ALL USING (
    is_super_admin()
);

-- LESSON CONTENT ITEMS
CREATE POLICY "content_admin_all" ON public.lesson_content_items FOR ALL USING (
    is_super_admin()
);

-- SYSTEM SETTINGS
CREATE POLICY "settings_admin_write" ON public.system_settings FOR ALL USING (
    is_super_admin()
);

-- CONTENT TEMPLATES
CREATE POLICY "templates_admin_write" ON public.content_templates FOR ALL USING (
    is_super_admin()
);
