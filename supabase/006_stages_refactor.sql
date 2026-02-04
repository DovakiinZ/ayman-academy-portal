-- ============================================
-- AYMAN ACADEMY - STAGES REFACTOR MIGRATION
-- Refactors from Course-based to Stage-based taxonomy
-- ============================================

-- ============================================
-- 1. CONTENT TYPE ENUM
-- ============================================

DO $$ BEGIN
    CREATE TYPE content_item_type AS ENUM ('video', 'article', 'image', 'file', 'link');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- ============================================
-- 2. ADD subject_id TO LESSONS (for new structure)
-- ============================================

-- Add subject_id column if it doesn't exist
ALTER TABLE public.lessons 
ADD COLUMN IF NOT EXISTS subject_id UUID REFERENCES public.subjects(id) ON DELETE CASCADE;

-- Make course_id nullable (for backward compatibility during transition)
ALTER TABLE public.lessons 
ALTER COLUMN course_id DROP NOT NULL;

-- Create index for subject-based queries
CREATE INDEX IF NOT EXISTS idx_lessons_subject ON public.lessons(subject_id);

-- ============================================
-- 3. LESSON CONTENT ITEMS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.lesson_content_items (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lesson_id UUID NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
    content_type content_item_type NOT NULL DEFAULT 'video',
    title_ar TEXT NOT NULL,
    title_en TEXT,
    -- For articles
    body_ar TEXT,
    body_en TEXT,
    -- For video/file/link/image
    url TEXT,
    -- For additional data
    metadata JSONB DEFAULT '{}',
    -- Ordering
    order_index INT DEFAULT 0,
    is_published BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_content_items_lesson ON public.lesson_content_items(lesson_id);
CREATE INDEX IF NOT EXISTS idx_content_items_type ON public.lesson_content_items(content_type);

-- ============================================
-- 4. ENABLE RLS ON NEW TABLE
-- ============================================

ALTER TABLE public.lesson_content_items ENABLE ROW LEVEL SECURITY;

-- Super Admin full access
CREATE POLICY "content_items_admin_all" ON public.lesson_content_items
FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin')
);

-- Teachers can manage content items for lessons they have access to
CREATE POLICY "content_items_teacher_manage" ON public.lesson_content_items
FOR ALL USING (
    EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.id = auth.uid() AND p.role = 'teacher'
    )
);

-- Students can view published content items
CREATE POLICY "content_items_view_published" ON public.lesson_content_items
FOR SELECT USING (is_published = true);

-- ============================================
-- 5. UPDATE LESSONS RLS FOR SUBJECT-BASED ACCESS
-- ============================================

-- Drop old policies if they exist
DROP POLICY IF EXISTS "lessons_subject_access" ON public.lessons;

-- Add policy for subject-based lesson access
CREATE POLICY "lessons_subject_access" ON public.lessons
FOR SELECT USING (
    -- Published lessons are visible if:
    is_published = true
    AND (
        -- Lesson has a subject_id (new structure)
        subject_id IS NOT NULL
        OR
        -- Or has course_id (old structure)
        course_id IS NOT NULL
    )
);

-- ============================================
-- 6. MIGRATION HELPER: Copy subject_id from courses
-- ============================================

-- Update lessons to have subject_id from their course (if not set)
UPDATE public.lessons l
SET subject_id = c.subject_id
FROM public.courses c
WHERE l.course_id = c.id
AND l.subject_id IS NULL
AND c.subject_id IS NOT NULL;

-- ============================================
-- 7. HELPER FUNCTIONS
-- ============================================

-- Get lessons for a subject
CREATE OR REPLACE FUNCTION public.get_subject_lessons(p_subject_id UUID)
RETURNS SETOF public.lessons AS $$
BEGIN
    RETURN QUERY
    SELECT * FROM public.lessons
    WHERE subject_id = p_subject_id
    AND is_published = true
    ORDER BY order_index ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get content items for a lesson
CREATE OR REPLACE FUNCTION public.get_lesson_content(p_lesson_id UUID)
RETURNS SETOF public.lesson_content_items AS $$
BEGIN
    RETURN QUERY
    SELECT * FROM public.lesson_content_items
    WHERE lesson_id = p_lesson_id
    AND is_published = true
    ORDER BY order_index ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 8. UPDATED_AT TRIGGER FOR CONTENT ITEMS
-- ============================================

CREATE OR REPLACE FUNCTION update_content_items_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_content_items_timestamp ON public.lesson_content_items;
CREATE TRIGGER update_content_items_timestamp
    BEFORE UPDATE ON public.lesson_content_items
    FOR EACH ROW EXECUTE FUNCTION update_content_items_updated_at();
