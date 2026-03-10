-- ============================================
-- AYMAN ACADEMY - COMPLETE DATABASE SCHEMA
-- Supabase PostgreSQL - Safe Reset Version
-- ============================================

-- Extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- CLEANUP (safe - ignores missing objects)
-- ============================================

-- Drop tables in reverse dependency order (CASCADE handles policies/triggers)
DROP TABLE IF EXISTS public.audit_logs CASCADE;
DROP TABLE IF EXISTS public.lesson_progress CASCADE;
DROP TABLE IF EXISTS public.access_grants CASCADE;
DROP TABLE IF EXISTS public.subscriptions CASCADE;
DROP TABLE IF EXISTS public.plans CASCADE;
DROP TABLE IF EXISTS public.lesson_resources CASCADE;
DROP TABLE IF EXISTS public.lessons CASCADE;
DROP TABLE IF EXISTS public.courses CASCADE;
DROP TABLE IF EXISTS public.subjects CASCADE;
DROP TABLE IF EXISTS public.levels CASCADE;
DROP TABLE IF EXISTS public.teacher_invites CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

-- Drop functions
DROP FUNCTION IF EXISTS check_single_super_admin() CASCADE;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
DROP FUNCTION IF EXISTS update_updated_at() CASCADE;
DROP FUNCTION IF EXISTS public.check_lesson_access(UUID, UUID) CASCADE;

-- Drop types
DROP TYPE IF EXISTS user_role CASCADE;
DROP TYPE IF EXISTS language_pref CASCADE;
DROP TYPE IF EXISTS invite_status CASCADE;
DROP TYPE IF EXISTS resource_type CASCADE;
DROP TYPE IF EXISTS plan_scope CASCADE;
DROP TYPE IF EXISTS subscription_status CASCADE;

-- ============================================
-- TYPES
-- ============================================

CREATE TYPE user_role AS ENUM ('super_admin', 'teacher', 'student');
CREATE TYPE language_pref AS ENUM ('ar', 'en');
CREATE TYPE invite_status AS ENUM ('pending', 'accepted', 'expired', 'revoked');
CREATE TYPE resource_type AS ENUM ('pdf', 'link', 'worksheet', 'other');
CREATE TYPE plan_scope AS ENUM ('all', 'level', 'subject', 'course');
CREATE TYPE subscription_status AS ENUM ('active', 'inactive', 'canceled', 'expired', 'pending');

-- ============================================
-- 1. PROFILES
-- ============================================

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  email TEXT UNIQUE NOT NULL,
  role user_role NOT NULL DEFAULT 'student',
  avatar_url TEXT,
  language_pref language_pref DEFAULT 'ar',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_profiles_role ON public.profiles(role);
CREATE INDEX idx_profiles_email ON public.profiles(email);

-- Single super_admin constraint
CREATE FUNCTION check_single_super_admin()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.role = 'super_admin' THEN
    IF EXISTS (SELECT 1 FROM public.profiles WHERE role = 'super_admin' AND id != NEW.id) THEN
      RAISE EXCEPTION 'Only one super_admin allowed';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_single_super_admin
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION check_single_super_admin();

-- Auto-create profile on signup
CREATE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    'student'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- 2. TEACHER INVITES
-- ============================================

CREATE TABLE public.teacher_invites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT NOT NULL,
  full_name TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  status invite_status DEFAULT 'pending',
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '7 days'),
  created_by UUID NOT NULL REFERENCES public.profiles(id),
  accepted_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_invites_email ON public.teacher_invites(email);
CREATE INDEX idx_invites_status ON public.teacher_invites(status);

-- ============================================
-- 3. LEVELS & SUBJECTS
-- ============================================

CREATE TABLE public.levels (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  slug TEXT UNIQUE NOT NULL,
  title_ar TEXT NOT NULL,
  title_en TEXT,
  sort_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.subjects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  level_id UUID NOT NULL REFERENCES public.levels(id) ON DELETE CASCADE,
  slug TEXT NOT NULL,
  title_ar TEXT NOT NULL,
  title_en TEXT,
  sort_order INT DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(level_id, slug)
);

CREATE INDEX idx_subjects_level ON public.subjects(level_id);

-- ============================================
-- 4. COURSES & LESSONS
-- ============================================

CREATE TABLE public.courses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  teacher_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  level_id UUID NOT NULL REFERENCES public.levels(id),
  subject_id UUID REFERENCES public.subjects(id),
  slug TEXT NOT NULL,
  title_ar TEXT NOT NULL,
  title_en TEXT,
  description_ar TEXT,
  description_en TEXT,
  cover_image_url TEXT,
  is_published BOOLEAN DEFAULT false,
  is_paid BOOLEAN DEFAULT true,
  price_amount NUMERIC(10,2),
  price_currency TEXT DEFAULT 'SAR',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_courses_teacher ON public.courses(teacher_id);
CREATE INDEX idx_courses_level ON public.courses(level_id);

CREATE TABLE public.lessons (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  slug TEXT NOT NULL,
  title_ar TEXT NOT NULL,
  title_en TEXT,
  summary_ar TEXT,
  summary_en TEXT,
  duration_seconds INT,
  order_index INT DEFAULT 0,
  preview_video_url TEXT,
  full_video_url TEXT,
  is_free_preview BOOLEAN DEFAULT false,
  is_published BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(course_id, slug)
);

CREATE INDEX idx_lessons_course ON public.lessons(course_id);

CREATE TABLE public.lesson_resources (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lesson_id UUID NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  type resource_type NOT NULL,
  title_ar TEXT NOT NULL,
  title_en TEXT,
  url TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 5. PLANS & SUBSCRIPTIONS
-- ============================================

CREATE TABLE public.plans (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name_ar text NOT NULL,
  name_en text,
  description_ar text,
  description_en text,
  billing text NOT NULL DEFAULT 'monthly' CHECK (billing IN ('monthly','yearly','lifetime')),
  price_cents integer NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'SAR',
  stage_id uuid REFERENCES public.stages(id) ON DELETE SET NULL,
  is_family boolean NOT NULL DEFAULT false,
  max_members integer,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE public.subscriptions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  plan_id UUID NOT NULL REFERENCES public.plans(id),
  status subscription_status NOT NULL DEFAULT 'pending',
  starts_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ends_at TIMESTAMPTZ,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_subs_user ON public.subscriptions(user_id);

CREATE TABLE public.access_grants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  course_id UUID REFERENCES public.courses(id),
  subject_id UUID REFERENCES public.subjects(id),
  level_id UUID REFERENCES public.levels(id),
  reason TEXT,
  granted_by UUID NOT NULL REFERENCES public.profiles(id),
  starts_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ends_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 6. PROGRESS & AUDIT
-- ============================================

CREATE TABLE public.lesson_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  lesson_id UUID NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  progress_percent INT DEFAULT 0,
  last_position_seconds INT DEFAULT 0,
  completed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, lesson_id)
);

CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  actor_id UUID REFERENCES public.profiles(id),
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- UPDATED_AT TRIGGER
-- ============================================

CREATE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_ts BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_courses_ts BEFORE UPDATE ON public.courses FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_lessons_ts BEFORE UPDATE ON public.lessons FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_progress_ts BEFORE UPDATE ON public.lesson_progress FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teacher_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.access_grants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Profiles
CREATE POLICY "profiles_select" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- Teacher invites
CREATE POLICY "invites_admin" ON public.teacher_invites FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin')
);

-- Levels/Subjects
CREATE POLICY "levels_select" ON public.levels FOR SELECT USING (true);
CREATE POLICY "levels_admin" ON public.levels FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin')
);
CREATE POLICY "subjects_select" ON public.subjects FOR SELECT USING (true);
CREATE POLICY "subjects_admin" ON public.subjects FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin')
);

-- Courses
CREATE POLICY "courses_select_published" ON public.courses FOR SELECT USING (is_published = true);
CREATE POLICY "courses_teacher_own" ON public.courses FOR ALL USING (teacher_id = auth.uid());
CREATE POLICY "courses_admin" ON public.courses FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin')
);

-- Lessons
CREATE POLICY "lessons_select_published" ON public.lessons FOR SELECT USING (is_published = true);
CREATE POLICY "lessons_teacher" ON public.lessons FOR ALL USING (
  EXISTS (SELECT 1 FROM public.courses WHERE id = lessons.course_id AND teacher_id = auth.uid())
);
CREATE POLICY "lessons_admin" ON public.lessons FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin')
);

-- Resources
CREATE POLICY "resources_select" ON public.lesson_resources FOR SELECT USING (true);
CREATE POLICY "resources_teacher" ON public.lesson_resources FOR ALL USING (
  EXISTS (SELECT 1 FROM public.lessons l JOIN public.courses c ON l.course_id = c.id 
          WHERE l.id = lesson_resources.lesson_id AND c.teacher_id = auth.uid())
);

-- Plans
DROP POLICY IF EXISTS "plans_select" ON public.plans;
DROP POLICY IF EXISTS "plans_admin" ON public.plans;
DROP POLICY IF EXISTS "Anyone reads active plans" ON public.plans;
DROP POLICY IF EXISTS "Admins manage plans" ON public.plans;

CREATE POLICY "Anyone reads active plans" ON public.plans FOR SELECT USING (is_active = true OR public.is_super_admin());

CREATE POLICY "Admins manage plans" ON public.plans FOR ALL USING (
  public.is_super_admin()
) WITH CHECK (
  public.is_super_admin()
);

GRANT ALL ON public.plans TO authenticated;
GRANT SELECT ON public.plans TO anon;

-- Subscriptions
CREATE POLICY "subs_select_own" ON public.subscriptions FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "subs_admin" ON public.subscriptions FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin')
);

-- Access grants
CREATE POLICY "grants_select_own" ON public.access_grants FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "grants_admin" ON public.access_grants FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin')
);

-- Progress
CREATE POLICY "progress_own" ON public.lesson_progress FOR ALL USING (user_id = auth.uid());

-- Audit logs
CREATE POLICY "audit_admin" ON public.audit_logs FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin')
);
CREATE POLICY "audit_insert" ON public.audit_logs FOR INSERT WITH CHECK (true);

-- ============================================
-- ACCESS CHECK FUNCTION
-- ============================================

CREATE FUNCTION public.check_lesson_access(p_user_id UUID, p_lesson_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_lesson RECORD;
BEGIN
  SELECT l.is_free_preview, c.level_id, c.subject_id, c.id as course_id
  INTO v_lesson
  FROM public.lessons l
  JOIN public.courses c ON l.course_id = c.id
  WHERE l.id = p_lesson_id;

  IF NOT FOUND THEN RETURN false; END IF;
  IF v_lesson.is_free_preview THEN RETURN true; END IF;

  -- Check subscription
  IF EXISTS (
    SELECT 1 FROM public.subscriptions s
    JOIN public.plans p ON s.plan_id = p.id
    WHERE s.user_id = p_user_id
      AND s.status = 'active'
      AND (s.ends_at IS NULL OR s.ends_at > NOW())
      AND (
        p.scope = 'all'
        OR (p.scope = 'level' AND p.level_id = v_lesson.level_id)
        OR (p.scope = 'subject' AND p.subject_id = v_lesson.subject_id)
        OR (p.scope = 'course' AND p.course_id = v_lesson.course_id)
      )
  ) THEN RETURN true; END IF;

  -- Check grants
  IF EXISTS (
    SELECT 1 FROM public.access_grants g
    WHERE g.user_id = p_user_id
      AND (g.ends_at IS NULL OR g.ends_at > NOW())
      AND (g.level_id = v_lesson.level_id OR g.subject_id = v_lesson.subject_id OR g.course_id = v_lesson.course_id)
  ) THEN RETURN true; END IF;

  RETURN false;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- SEED DATA
-- ============================================

INSERT INTO public.levels (slug, title_ar, title_en, sort_order) VALUES
  ('kindergarten', 'تمهيدي', 'Kindergarten', 1),
  ('primary', 'ابتدائي', 'Primary', 2),
  ('middle', 'متوسط', 'Middle School', 3);

-- ============================================
-- DONE! Create super admin after signup:
-- UPDATE public.profiles SET role = 'super_admin' WHERE email = 'YOUR_EMAIL';
-- ============================================
