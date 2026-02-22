-- ==============================================================================
-- 014 ADMIN PANEL HARDENING
-- Fixes RLS policies, ensures proper WITH CHECK clauses, adds missing fields
-- ==============================================================================

/*
 * ROOT CAUSE EXPLANATION:
 * -----------------------
 * RLS (Row Level Security) blocks table access by default in Supabase.
 * When RLS is enabled but policies are incomplete:
 *   - SELECT returns empty arrays []
 *   - INSERT/UPDATE/DELETE fail with "permission denied" or return 0 rows affected
 * 
 * Common mistakes that cause "saved in UI but not in DB":
 *   1. FOR ALL policies without WITH CHECK - inserts fail
 *   2. Policies that query the same table (profiles checking profiles) - infinite recursion
 *   3. Frontend ignoring error objects - shows success when DB rejected the operation
 * 
 * This migration fixes all RLS policies to properly allow admin operations.
 */

-- ============================================
-- 1. ENSURE is_super_admin FUNCTION EXISTS
-- ============================================
-- This function uses SECURITY DEFINER to bypass RLS when checking admin status
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

-- Helper function to check if user is a teacher
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

-- ============================================
-- 2. ADD MISSING PROFILE FIELDS FOR TEACHERS
-- ============================================
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bio_ar TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bio_en TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS show_on_home BOOLEAN DEFAULT false;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS home_order INT DEFAULT 0;

-- ============================================
-- 3. ENSURE TEACHER_INVITES TABLE EXISTS
-- ============================================
CREATE TABLE IF NOT EXISTS public.teacher_invites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL,
    full_name TEXT NOT NULL,
    token_hash TEXT NOT NULL UNIQUE,
    status TEXT CHECK (status IN ('pending', 'accepted', 'expired', 'revoked')) DEFAULT 'pending',
    expires_at TIMESTAMPTZ NOT NULL,
    created_by UUID REFERENCES public.profiles(id),
    accepted_by UUID REFERENCES public.profiles(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.teacher_invites ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 4. ADD ID TO CONTENT_TEMPLATES IF MISSING
-- ============================================
DO $$
BEGIN
    -- Check if id column exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'content_templates' 
        AND column_name = 'id'
    ) THEN
        -- Add id column
        ALTER TABLE public.content_templates ADD COLUMN id UUID DEFAULT gen_random_uuid();
        -- Make key not primary key if it was, add id as primary key
        -- This is complex, so we'll just ensure id exists with a default
    END IF;
END $$;

-- Add description column if missing
ALTER TABLE public.content_templates ADD COLUMN IF NOT EXISTS description TEXT;

-- ============================================
-- 5. DROP ALL EXISTING POLICIES (CLEAN SLATE)
-- ============================================
DO $$ 
DECLARE 
    r RECORD; 
BEGIN 
    FOR r IN (
        SELECT tablename, policyname 
        FROM pg_policies 
        WHERE schemaname = 'public'
        AND tablename IN ('profiles', 'stages', 'subjects', 'lessons', 'lesson_content_items', 'system_settings', 'content_templates', 'teacher_invites')
    ) LOOP 
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON public.' || r.tablename; 
    END LOOP; 
END $$;

-- ============================================
-- 6. PROFILES POLICIES
-- ============================================
-- Everyone can view profiles (needed for teacher lists, etc.)
CREATE POLICY "profiles_select_all" ON public.profiles 
    FOR SELECT USING (true);

-- Users can insert their own profile (for signup)
CREATE POLICY "profiles_insert_own" ON public.profiles 
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "profiles_update_own" ON public.profiles 
    FOR UPDATE USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Super admin can do everything with profiles
CREATE POLICY "profiles_admin_all" ON public.profiles 
    FOR ALL USING (is_super_admin()) WITH CHECK (is_super_admin());

-- ============================================
-- 7. STAGES POLICIES
-- ============================================
-- Public can read active stages
CREATE POLICY "stages_select_active" ON public.stages 
    FOR SELECT USING (is_active = true OR is_super_admin());

-- Super admin can do everything with stages
CREATE POLICY "stages_admin_insert" ON public.stages 
    FOR INSERT WITH CHECK (is_super_admin());

CREATE POLICY "stages_admin_update" ON public.stages 
    FOR UPDATE USING (is_super_admin()) WITH CHECK (is_super_admin());

CREATE POLICY "stages_admin_delete" ON public.stages 
    FOR DELETE USING (is_super_admin());

-- ============================================
-- 8. SUBJECTS POLICIES
-- ============================================
-- Public can read active subjects
CREATE POLICY "subjects_select_active" ON public.subjects 
    FOR SELECT USING (is_active = true OR is_super_admin());

-- Super admin can do everything with subjects
CREATE POLICY "subjects_admin_insert" ON public.subjects 
    FOR INSERT WITH CHECK (is_super_admin());

CREATE POLICY "subjects_admin_update" ON public.subjects 
    FOR UPDATE USING (is_super_admin()) WITH CHECK (is_super_admin());

CREATE POLICY "subjects_admin_delete" ON public.subjects 
    FOR DELETE USING (is_super_admin());

-- ============================================
-- 9. LESSONS POLICIES
-- ============================================
-- Students can read published lessons
CREATE POLICY "lessons_select_published" ON public.lessons 
    FOR SELECT USING (is_published = true OR is_super_admin() OR created_by = auth.uid());

-- Teachers can insert lessons (with created_by = their id)
CREATE POLICY "lessons_teacher_insert" ON public.lessons 
    FOR INSERT WITH CHECK (is_super_admin() OR (is_teacher() AND created_by = auth.uid()));

-- Teachers can update their own lessons, admins can update all
CREATE POLICY "lessons_teacher_update" ON public.lessons 
    FOR UPDATE USING (is_super_admin() OR created_by = auth.uid()) 
    WITH CHECK (is_super_admin() OR created_by = auth.uid());

-- Teachers can delete their own lessons, admins can delete all
CREATE POLICY "lessons_teacher_delete" ON public.lessons 
    FOR DELETE USING (is_super_admin() OR created_by = auth.uid());

-- ============================================
-- 10. LESSON_CONTENT_ITEMS POLICIES
-- ============================================
-- Students can read published content items (via lesson)
CREATE POLICY "content_select" ON public.lesson_content_items 
    FOR SELECT USING (
        is_super_admin() 
        OR EXISTS (
            SELECT 1 FROM public.lessons 
            WHERE id = lesson_content_items.lesson_id 
            AND (is_published = true OR created_by = auth.uid())
        )
    );

-- Teachers can insert content for their lessons, admins for all
CREATE POLICY "content_insert" ON public.lesson_content_items 
    FOR INSERT WITH CHECK (
        is_super_admin() 
        OR EXISTS (
            SELECT 1 FROM public.lessons 
            WHERE id = lesson_content_items.lesson_id 
            AND created_by = auth.uid()
        )
    );

-- Teachers can update content for their lessons, admins for all
CREATE POLICY "content_update" ON public.lesson_content_items 
    FOR UPDATE USING (
        is_super_admin() 
        OR EXISTS (
            SELECT 1 FROM public.lessons 
            WHERE id = lesson_content_items.lesson_id 
            AND created_by = auth.uid()
        )
    ) WITH CHECK (
        is_super_admin() 
        OR EXISTS (
            SELECT 1 FROM public.lessons 
            WHERE id = lesson_content_items.lesson_id 
            AND created_by = auth.uid()
        )
    );

-- Teachers can delete content for their lessons, admins for all
CREATE POLICY "content_delete" ON public.lesson_content_items 
    FOR DELETE USING (
        is_super_admin() 
        OR EXISTS (
            SELECT 1 FROM public.lessons 
            WHERE id = lesson_content_items.lesson_id 
            AND created_by = auth.uid()
        )
    );

-- ============================================
-- 11. SYSTEM_SETTINGS POLICIES
-- ============================================
-- Everyone can read settings
CREATE POLICY "settings_select_all" ON public.system_settings 
    FOR SELECT USING (true);

-- Only admin can modify settings
CREATE POLICY "settings_admin_insert" ON public.system_settings 
    FOR INSERT WITH CHECK (is_super_admin());

CREATE POLICY "settings_admin_update" ON public.system_settings 
    FOR UPDATE USING (is_super_admin()) WITH CHECK (is_super_admin());

CREATE POLICY "settings_admin_delete" ON public.system_settings 
    FOR DELETE USING (is_super_admin());

-- ============================================
-- 12. CONTENT_TEMPLATES POLICIES
-- ============================================
-- Everyone can read templates
CREATE POLICY "templates_select_all" ON public.content_templates 
    FOR SELECT USING (true);

-- Only admin can modify templates
CREATE POLICY "templates_admin_insert" ON public.content_templates 
    FOR INSERT WITH CHECK (is_super_admin());

CREATE POLICY "templates_admin_update" ON public.content_templates 
    FOR UPDATE USING (is_super_admin()) WITH CHECK (is_super_admin());

CREATE POLICY "templates_admin_delete" ON public.content_templates 
    FOR DELETE USING (is_super_admin());

-- ============================================
-- 13. TEACHER_INVITES POLICIES
-- ============================================
-- Only admin can view invites
CREATE POLICY "invites_admin_select" ON public.teacher_invites 
    FOR SELECT USING (is_super_admin());

-- Only admin can create invites
CREATE POLICY "invites_admin_insert" ON public.teacher_invites 
    FOR INSERT WITH CHECK (is_super_admin());

-- Only admin can update invites
CREATE POLICY "invites_admin_update" ON public.teacher_invites 
    FOR UPDATE USING (is_super_admin()) WITH CHECK (is_super_admin());

-- Only admin can delete invites
CREATE POLICY "invites_admin_delete" ON public.teacher_invites 
    FOR DELETE USING (is_super_admin());

-- ============================================
-- 14. GRANT PERMISSIONS
-- ============================================
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO anon;

GRANT SELECT ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;

GRANT INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.stages TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.subjects TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.lessons TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.lesson_content_items TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.system_settings TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.content_templates TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.teacher_invites TO authenticated;

-- ============================================
-- MIGRATION COMPLETE
-- ============================================
-- After running this migration:
-- 1. Super admins can perform all CRUD operations on admin tables
-- 2. Teachers can manage their own lessons and content
-- 3. Students can read published content
-- 4. All policies have proper WITH CHECK clauses for inserts
