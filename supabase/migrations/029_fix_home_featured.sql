-- ============================================
-- 029: Fix Missing Homepage Featured Content
-- Consolidates definitions from 007_homepage_featured.sql
-- ============================================

-- Part 1: Ensure homepage fields exist in profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bio_ar TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bio_en TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS expertise_tags_ar TEXT[];
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS show_on_home BOOLEAN DEFAULT FALSE;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS home_order INT DEFAULT 0;

-- Part 2: Featured Subjects Table
CREATE TABLE IF NOT EXISTS public.home_featured_subjects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
    teaser_ar TEXT,
    teaser_en TEXT,
    is_visible BOOLEAN DEFAULT TRUE,
    home_order INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(subject_id)
);

-- Part 3: Featured Lessons Table
CREATE TABLE IF NOT EXISTS public.home_featured_lessons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    lesson_id UUID NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
    teaser_ar TEXT,
    teaser_en TEXT,
    is_visible BOOLEAN DEFAULT TRUE,
    home_order INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(lesson_id)
);

-- Part 4: RLS Policies

-- Featured Subjects: Public read, admin write
ALTER TABLE public.home_featured_subjects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "home_featured_subjects_public_read" ON public.home_featured_subjects;
CREATE POLICY "home_featured_subjects_public_read" ON public.home_featured_subjects
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "home_featured_subjects_admin_all" ON public.home_featured_subjects;
CREATE POLICY "home_featured_subjects_admin_all" ON public.home_featured_subjects
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin')
    );

-- Featured Lessons: Public read, admin write
ALTER TABLE public.home_featured_lessons ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "home_featured_lessons_public_read" ON public.home_featured_lessons;
CREATE POLICY "home_featured_lessons_public_read" ON public.home_featured_lessons
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "home_featured_lessons_admin_all" ON public.home_featured_lessons;
CREATE POLICY "home_featured_lessons_admin_all" ON public.home_featured_lessons
    FOR ALL USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin')
    );

-- Part 5: Indexes for performance
CREATE INDEX IF NOT EXISTS idx_profiles_show_on_home ON public.profiles(show_on_home, home_order) WHERE role = 'teacher';
CREATE INDEX IF NOT EXISTS idx_home_featured_subjects_visible ON public.home_featured_subjects(is_visible, home_order);
CREATE INDEX IF NOT EXISTS idx_home_featured_lessons_visible ON public.home_featured_lessons(is_visible, home_order);
