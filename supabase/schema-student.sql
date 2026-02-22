-- ============================================
-- AYMAN ACADEMY - STUDENT FEATURES SCHEMA
-- Run after main schema.sql
-- ============================================

-- ============================================
-- 1. MESSAGES (Student <-> Teacher)
-- ============================================

CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_messages_sender ON public.messages(sender_id);
CREATE INDEX idx_messages_receiver ON public.messages(receiver_id);
CREATE INDEX idx_messages_conversation ON public.messages(sender_id, receiver_id, created_at DESC);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Users can read/send their own messages
CREATE POLICY "messages_own" ON public.messages FOR ALL USING (
  sender_id = auth.uid() OR receiver_id = auth.uid()
);

-- ============================================
-- 2. LESSON NOTES (Private to Student)
-- ============================================

CREATE TABLE IF NOT EXISTS public.lesson_notes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  lesson_id UUID NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  position_seconds INT DEFAULT 0,
  scroll_position INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notes_user_lesson ON public.lesson_notes(user_id, lesson_id);

ALTER TABLE public.lesson_notes ENABLE ROW LEVEL SECURITY;

-- Notes are private to the owner
CREATE POLICY "notes_own" ON public.lesson_notes FOR ALL USING (user_id = auth.uid());

-- ============================================
-- 3. LESSON COMMENTS (Student <-> Teacher)
-- ============================================

CREATE TABLE IF NOT EXISTS public.lesson_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  lesson_id UUID NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  parent_id UUID REFERENCES public.lesson_comments(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_comments_lesson ON public.lesson_comments(lesson_id, created_at);
CREATE INDEX idx_comments_user ON public.lesson_comments(user_id);

ALTER TABLE public.lesson_comments ENABLE ROW LEVEL SECURITY;

-- Users can read comments on lessons they can access
CREATE POLICY "comments_read" ON public.lesson_comments FOR SELECT USING (true);

-- Users can create comments
CREATE POLICY "comments_insert" ON public.lesson_comments FOR INSERT WITH CHECK (user_id = auth.uid());

-- Users can delete own comments
CREATE POLICY "comments_delete" ON public.lesson_comments FOR DELETE USING (user_id = auth.uid());

-- ============================================
-- 4. RATINGS (Courses and Lessons)
-- ============================================

CREATE TABLE IF NOT EXISTS public.ratings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('course', 'lesson')),
  entity_id UUID NOT NULL,
  stars INT NOT NULL CHECK (stars >= 1 AND stars <= 5),
  feedback TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, entity_type, entity_id)
);

CREATE INDEX idx_ratings_entity ON public.ratings(entity_type, entity_id);
CREATE INDEX idx_ratings_user ON public.ratings(user_id);

ALTER TABLE public.ratings ENABLE ROW LEVEL SECURITY;

-- Users can read all ratings
CREATE POLICY "ratings_read" ON public.ratings FOR SELECT USING (true);

-- Users can manage own ratings
CREATE POLICY "ratings_own" ON public.ratings FOR ALL USING (user_id = auth.uid());

-- ============================================
-- 5. UPDATE TRIGGERS
-- ============================================

CREATE TRIGGER update_notes_ts BEFORE UPDATE ON public.lesson_notes
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- 6. HELPER FUNCTIONS
-- ============================================

-- Get student's accessible teachers (via subscriptions/grants)
CREATE OR REPLACE FUNCTION public.get_student_teachers(p_user_id UUID)
RETURNS TABLE(teacher_id UUID) AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT c.teacher_id
  FROM public.courses c
  WHERE c.is_published = true
    AND (
      -- Has active subscription covering this course
      EXISTS (
        SELECT 1 FROM public.subscriptions s
        JOIN public.plans p ON s.plan_id = p.id
        WHERE s.user_id = p_user_id
          AND s.status = 'active'
          AND (s.ends_at IS NULL OR s.ends_at > NOW())
          AND (
            p.scope = 'all'
            OR (p.scope = 'level' AND p.level_id = c.level_id)
            OR (p.scope = 'subject' AND p.subject_id = c.subject_id)
            OR (p.scope = 'course' AND p.course_id = c.id)
          )
      )
      -- Or has direct access grant
      OR EXISTS (
        SELECT 1 FROM public.access_grants g
        WHERE g.user_id = p_user_id
          AND (g.ends_at IS NULL OR g.ends_at > NOW())
          AND (g.course_id = c.id OR g.subject_id = c.subject_id OR g.level_id = c.level_id)
      )
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Get student's accessible courses
CREATE OR REPLACE FUNCTION public.get_student_courses(p_user_id UUID)
RETURNS TABLE(course_id UUID) AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT c.id
  FROM public.courses c
  WHERE c.is_published = true
    AND (
      EXISTS (
        SELECT 1 FROM public.subscriptions s
        JOIN public.plans p ON s.plan_id = p.id
        WHERE s.user_id = p_user_id
          AND s.status = 'active'
          AND (s.ends_at IS NULL OR s.ends_at > NOW())
          AND (
            p.scope = 'all'
            OR (p.scope = 'level' AND p.level_id = c.level_id)
            OR (p.scope = 'subject' AND p.subject_id = c.subject_id)
            OR (p.scope = 'course' AND p.course_id = c.id)
          )
      )
      OR EXISTS (
        SELECT 1 FROM public.access_grants g
        WHERE g.user_id = p_user_id
          AND (g.ends_at IS NULL OR g.ends_at > NOW())
          AND (g.course_id = c.id OR g.subject_id = c.subject_id OR g.level_id = c.level_id)
      )
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- DONE!
-- ============================================
