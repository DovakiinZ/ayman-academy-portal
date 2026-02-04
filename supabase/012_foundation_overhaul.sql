-- ==============================================================================
-- 012 FOUNDATION OVERHAUL
-- Re-architects the database to remove Courses and enforce Stage -> Subject -> Lesson
-- Adds strict RLS policies and System Settings
-- ==============================================================================

-- 1. CLEANUP OLD SCHEMA
-- Drop tables that are no longer part of the rigorous model
DROP TABLE IF EXISTS public.subscriptions CASCADE; -- Re-implement later if needed for plans
DROP TABLE IF EXISTS public.course_enrollments CASCADE;
DROP TABLE IF EXISTS public.lesson_resources CASCADE; -- Replaced by lesson_content_items
DROP TABLE IF EXISTS public.courses CASCADE; -- REMOVING COURSES CONCEPT

-- 2. ENSURE CORE TABLES
-- PROFILES
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name TEXT,
    email TEXT,
    role TEXT CHECK (role IN ('super_admin', 'teacher', 'student')),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- STAGES
CREATE TABLE IF NOT EXISTS public.stages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT UNIQUE,
    title_ar TEXT NOT NULL,
    title_en TEXT,
    sort_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- SUBJECTS
CREATE TABLE IF NOT EXISTS public.subjects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    stage_id UUID REFERENCES public.stages(id) ON DELETE CASCADE,
    title_ar TEXT NOT NULL,
    title_en TEXT,
    description_ar TEXT,
    description_en TEXT,
    sort_order INT DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- LESSONS (Modified to remove course_id and link to subjects)
-- If table exists, we alter it. If not, we create it.
DO $$ 
BEGIN
    -- If lessons exists but has course_id, we need to adapt it. 
    -- For safety in this "Overhaul", we will recreate logic or add columns.
    -- If subjects exists, we assume lessons might need subject_id.
    
    -- Drop course_id if it exists
    BEGIN
        ALTER TABLE public.lessons DROP COLUMN IF EXISTS course_id;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;

    -- Add subject_id if not exists
    BEGIN
        ALTER TABLE public.lessons ADD COLUMN IF NOT EXISTS subject_id UUID REFERENCES public.subjects(id) ON DELETE CASCADE;
    EXCEPTION WHEN OTHERS THEN NULL;
    END;

    -- Update other columns specific to requirements
    ALTER TABLE public.lessons ADD COLUMN IF NOT EXISTS summary_ar TEXT;
    ALTER TABLE public.lessons ADD COLUMN IF NOT EXISTS summary_en TEXT;
    ALTER TABLE public.lessons ADD COLUMN IF NOT EXISTS order_index INT DEFAULT 0;
    ALTER TABLE public.lessons ADD COLUMN IF NOT EXISTS is_published BOOLEAN DEFAULT false;
    ALTER TABLE public.lessons ADD COLUMN IF NOT EXISTS is_paid BOOLEAN DEFAULT true;
    ALTER TABLE public.lessons ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES public.profiles(id);

END $$;

-- LESSON CONTENT ITEMS
CREATE TABLE IF NOT EXISTS public.lesson_content_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lesson_id UUID REFERENCES public.lessons(id) ON DELETE CASCADE,
    type TEXT CHECK (type IN ('video', 'article', 'image', 'file', 'link')),
    title_ar TEXT,
    title_en TEXT,
    body_ar TEXT,
    body_en TEXT,
    url TEXT,
    order_index INT DEFAULT 0,
    is_published BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- SYSTEM SETTINGS
CREATE TABLE IF NOT EXISTS public.system_settings (
    key TEXT PRIMARY KEY,
    value JSONB,
    description TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- CONTENT TEMPLATES (Ensure existence)
CREATE TABLE IF NOT EXISTS public.content_templates (
    key TEXT PRIMARY KEY,
    category TEXT,
    content_ar TEXT,
    content_en TEXT,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);


-- 3. ROW LEVEL SECURITY (STRICT)
-- Enable RLS on everything matches expectations
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_content_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_templates ENABLE ROW LEVEL SECURITY;

-- DROP ALL EXISTING POLICIES TO START FRESH
-- (Dynamic SQL to clear policies would be complex, here we drop known ones or generic)
-- Only super_admin usually has access to SQL editor, so we act authoritative.

DO $$ 
DECLARE 
    r RECORD; 
BEGIN 
    FOR r IN (SELECT tablename, policyname FROM pg_policies WHERE schemaname = 'public') LOOP 
        EXECUTE 'DROP POLICY IF EXISTS "' || r.policyname || '" ON public.' || r.tablename; 
    END LOOP; 
END $$;

-- ===========================
-- RLS POLICIES IMPLEMENTATION
-- ===========================

-- 3.1 PROFILES
-- View own, view all (needed for teacher lists), update own
CREATE POLICY "profiles_select_all" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "profiles_admin_all" ON public.profiles FOR ALL USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'super_admin'
);

-- 3.2 STAGES
-- Public view active, Admin manage all
CREATE POLICY "stages_read_published" ON public.stages FOR SELECT USING (is_active = true);
CREATE POLICY "stages_admin_all" ON public.stages FOR ALL USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'super_admin'
);

-- 3.3 SUBJECTS
-- Public view active, Admin manage all
CREATE POLICY "subjects_read_published" ON public.subjects FOR SELECT USING (is_active = true);
CREATE POLICY "subjects_admin_all" ON public.subjects FOR ALL USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'super_admin'
);

-- 3.4 LESSONS
-- Student: View published
-- Teacher: View/Edit OWN created lessons
-- Admin: View/Edit ALL
CREATE POLICY "lessons_student_read" ON public.lessons FOR SELECT USING (is_published = true);
CREATE POLICY "lessons_teacher_own" ON public.lessons FOR ALL USING (created_by = auth.uid());
CREATE POLICY "lessons_admin_all" ON public.lessons FOR ALL USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'super_admin'
);

-- 3.5 LESSON CONTENT ITEMS
-- Access inherited from lesson
CREATE POLICY "content_student_read" ON public.lesson_content_items FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.lessons WHERE id = lesson_id AND is_published = true)
);
CREATE POLICY "content_teacher_own" ON public.lesson_content_items FOR ALL USING (
    EXISTS (SELECT 1 FROM public.lessons WHERE id = lesson_id AND created_by = auth.uid())
);
CREATE POLICY "content_admin_all" ON public.lesson_content_items FOR ALL USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'super_admin'
);

-- 3.6 SYSTEM SETTINGS & TEMPLATES
-- Read public, Write Admin only
CREATE POLICY "settings_read_all" ON public.system_settings FOR SELECT USING (true);
CREATE POLICY "settings_admin_write" ON public.system_settings FOR ALL USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'super_admin'
);

CREATE POLICY "templates_read_all" ON public.content_templates FOR SELECT USING (true);
CREATE POLICY "templates_admin_write" ON public.content_templates FOR ALL USING (
    (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'super_admin'
);
