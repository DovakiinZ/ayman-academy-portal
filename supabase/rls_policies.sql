-- ============================================================
-- Supabase RLS Policies for Ayman Academy
-- Enable Row Level Security on all tables with role-based access
-- ============================================================

-- ============================================================
-- HELPER FUNCTION: Get current user's role
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_user_role()
RETURNS TEXT AS $$
  SELECT role::text FROM public.profiles WHERE id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ============================================================
-- PROFILES TABLE
-- ============================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Super admin: full access
CREATE POLICY "profiles_super_admin_all" ON public.profiles
  FOR ALL
  TO authenticated
  USING (public.get_user_role() = 'super_admin')
  WITH CHECK (public.get_user_role() = 'super_admin');

-- Users can view and update their own profile
CREATE POLICY "profiles_self_select" ON public.profiles
  FOR SELECT
  TO authenticated
  USING (id = auth.uid());

CREATE POLICY "profiles_self_update" ON public.profiles
  FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- ============================================================
-- LEVELS TABLE
-- ============================================================
ALTER TABLE public.levels ENABLE ROW LEVEL SECURITY;

-- Super admin: full access
CREATE POLICY "levels_super_admin_all" ON public.levels
  FOR ALL
  TO authenticated
  USING (public.get_user_role() = 'super_admin')
  WITH CHECK (public.get_user_role() = 'super_admin');

-- Everyone can read active levels
CREATE POLICY "levels_read_active" ON public.levels
  FOR SELECT
  TO authenticated
  USING (is_active = true);

-- Public/anonymous can also read active levels
CREATE POLICY "levels_public_read" ON public.levels
  FOR SELECT
  TO anon
  USING (is_active = true);

-- ============================================================
-- SUBJECTS TABLE
-- ============================================================
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;

-- Super admin: full access
CREATE POLICY "subjects_super_admin_all" ON public.subjects
  FOR ALL
  TO authenticated
  USING (public.get_user_role() = 'super_admin')
  WITH CHECK (public.get_user_role() = 'super_admin');

-- Everyone can read active subjects
CREATE POLICY "subjects_read_active" ON public.subjects
  FOR SELECT
  TO authenticated
  USING (is_active = true);

-- Public/anonymous can also read active subjects
CREATE POLICY "subjects_public_read" ON public.subjects
  FOR SELECT
  TO anon
  USING (is_active = true);

-- ============================================================
-- COURSES TABLE
-- ============================================================
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;

-- Super admin: full access
CREATE POLICY "courses_super_admin_all" ON public.courses
  FOR ALL
  TO authenticated
  USING (public.get_user_role() = 'super_admin')
  WITH CHECK (public.get_user_role() = 'super_admin');

-- Teachers: full CRUD on their own courses
CREATE POLICY "courses_teacher_select" ON public.courses
  FOR SELECT
  TO authenticated
  USING (
    teacher_id = auth.uid() AND public.get_user_role() = 'teacher'
  );

CREATE POLICY "courses_teacher_insert" ON public.courses
  FOR INSERT
  TO authenticated
  WITH CHECK (
    teacher_id = auth.uid() AND public.get_user_role() = 'teacher'
  );

CREATE POLICY "courses_teacher_update" ON public.courses
  FOR UPDATE
  TO authenticated
  USING (
    teacher_id = auth.uid() AND public.get_user_role() = 'teacher'
  )
  WITH CHECK (
    teacher_id = auth.uid() AND public.get_user_role() = 'teacher'
  );

CREATE POLICY "courses_teacher_delete" ON public.courses
  FOR DELETE
  TO authenticated
  USING (
    teacher_id = auth.uid() AND public.get_user_role() = 'teacher'
  );

-- Students: read published courses only
CREATE POLICY "courses_student_read" ON public.courses
  FOR SELECT
  TO authenticated
  USING (
    is_published = true AND public.get_user_role() = 'student'
  );

-- Public/anonymous: read published courses
CREATE POLICY "courses_public_read" ON public.courses
  FOR SELECT
  TO anon
  USING (is_published = true);

-- ============================================================
-- LESSONS TABLE
-- ============================================================
ALTER TABLE public.lessons ENABLE ROW LEVEL SECURITY;

-- Super admin: full access
CREATE POLICY "lessons_super_admin_all" ON public.lessons
  FOR ALL
  TO authenticated
  USING (public.get_user_role() = 'super_admin')
  WITH CHECK (public.get_user_role() = 'super_admin');

-- Teachers: CRUD on lessons of their own courses
CREATE POLICY "lessons_teacher_select" ON public.lessons
  FOR SELECT
  TO authenticated
  USING (
    public.get_user_role() = 'teacher'
    AND EXISTS (
      SELECT 1 FROM public.courses
      WHERE courses.id = lessons.course_id
      AND courses.teacher_id = auth.uid()
    )
  );

CREATE POLICY "lessons_teacher_insert" ON public.lessons
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.get_user_role() = 'teacher'
    AND EXISTS (
      SELECT 1 FROM public.courses
      WHERE courses.id = lessons.course_id
      AND courses.teacher_id = auth.uid()
    )
  );

CREATE POLICY "lessons_teacher_update" ON public.lessons
  FOR UPDATE
  TO authenticated
  USING (
    public.get_user_role() = 'teacher'
    AND EXISTS (
      SELECT 1 FROM public.courses
      WHERE courses.id = lessons.course_id
      AND courses.teacher_id = auth.uid()
    )
  )
  WITH CHECK (
    public.get_user_role() = 'teacher'
    AND EXISTS (
      SELECT 1 FROM public.courses
      WHERE courses.id = lessons.course_id
      AND courses.teacher_id = auth.uid()
    )
  );

CREATE POLICY "lessons_teacher_delete" ON public.lessons
  FOR DELETE
  TO authenticated
  USING (
    public.get_user_role() = 'teacher'
    AND EXISTS (
      SELECT 1 FROM public.courses
      WHERE courses.id = lessons.course_id
      AND courses.teacher_id = auth.uid()
    )
  );

-- Students: read published lessons
CREATE POLICY "lessons_student_read" ON public.lessons
  FOR SELECT
  TO authenticated
  USING (
    is_published = true
    AND public.get_user_role() = 'student'
  );

-- Public/anonymous: read published lessons
CREATE POLICY "lessons_public_read" ON public.lessons
  FOR SELECT
  TO anon
  USING (is_published = true);

-- ============================================================
-- TEACHER_INVITES TABLE (if exists)
-- ============================================================
ALTER TABLE public.teacher_invites ENABLE ROW LEVEL SECURITY;

-- Super admin only: full access
CREATE POLICY "teacher_invites_super_admin_all" ON public.teacher_invites
  FOR ALL
  TO authenticated
  USING (public.get_user_role() = 'super_admin')
  WITH CHECK (public.get_user_role() = 'super_admin');
