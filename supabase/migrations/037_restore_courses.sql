-- ============================================
-- RESTORE COURSES SCHEMA
-- Migration: 037_restore_courses.sql
-- ============================================

-- 1. Re-create courses table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.courses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  teacher_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  level_id UUID NOT NULL REFERENCES public.stages(id),
  subject_id UUID REFERENCES public.subjects(id),
  slug TEXT NOT NULL,
  title_ar TEXT NOT NULL,
  title_en TEXT,
  description_ar TEXT,
  description_en TEXT,
  cover_image_url TEXT,
  is_published BOOLEAN DEFAULT false,
  is_paid BOOLEAN DEFAULT true,
  price_amount NUMERIC(10,2) DEFAULT 0,
  price_currency TEXT DEFAULT 'SAR',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexing for performance
CREATE INDEX IF NOT EXISTS idx_courses_teacher ON public.courses(teacher_id);
CREATE INDEX IF NOT EXISTS idx_courses_level ON public.courses(level_id);

-- 2. Add course_id back to lessons if it's missing
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'lessons' 
        AND column_name = 'course_id'
    ) THEN
        ALTER TABLE public.lessons ADD COLUMN course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE;
        CREATE INDEX idx_lessons_course ON public.lessons(course_id);
    END IF;
END $$;

-- 3. Ensure access_grants table exists or update it to reference course_id
CREATE TABLE IF NOT EXISTS public.access_grants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE,
  subject_id UUID REFERENCES public.subjects(id) ON DELETE CASCADE,
  level_id UUID REFERENCES public.stages(id) ON DELETE CASCADE,
  reason TEXT,
  granted_by UUID NOT NULL REFERENCES public.profiles(id),
  starts_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ends_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Enable RLS
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.access_grants ENABLE ROW LEVEL SECURITY;

-- 5. Drop and recreates policies for courses
DROP POLICY IF EXISTS "courses_select_published" ON public.courses;
DROP POLICY IF EXISTS "courses_teacher_own" ON public.courses;
DROP POLICY IF EXISTS "courses_admin" ON public.courses;

CREATE POLICY "courses_select_published" ON public.courses FOR SELECT USING (is_published = true);
CREATE POLICY "courses_teacher_own" ON public.courses FOR ALL USING (teacher_id = auth.uid());
CREATE POLICY "courses_admin" ON public.courses FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin')
);

-- 6. Add updated_at trigger for courses
DROP TRIGGER IF EXISTS update_courses_ts ON public.courses;
CREATE TRIGGER update_courses_ts BEFORE UPDATE ON public.courses FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 7. RLS for access_grants
DROP POLICY IF EXISTS "grants_select_own" ON public.access_grants;
DROP POLICY IF EXISTS "grants_admin" ON public.access_grants;

CREATE POLICY "grants_select_own" ON public.access_grants FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "grants_admin" ON public.access_grants FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin')
);
