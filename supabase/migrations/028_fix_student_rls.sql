-- ============================================
-- FIX: Student RLS Policies (All Student Tables)
-- Run in Supabase SQL Editor
-- Fixes 403 Forbidden on lesson progress saving
-- ============================================

-- ============================================
-- 1. LESSON_PROGRESS — Students can read/write their own progress
-- ============================================

-- Ensure the table exists
CREATE TABLE IF NOT EXISTS public.lesson_progress (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    lesson_id UUID NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
    progress_percent INT DEFAULT 0,
    last_position_seconds INT DEFAULT 0,
    completed_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, lesson_id)
);

ALTER TABLE public.lesson_progress ENABLE ROW LEVEL SECURITY;

-- Drop ALL existing policies to start clean
DROP POLICY IF EXISTS "progress_own" ON public.lesson_progress;
DROP POLICY IF EXISTS "progress_own_select" ON public.lesson_progress;
DROP POLICY IF EXISTS "progress_own_insert" ON public.lesson_progress;
DROP POLICY IF EXISTS "progress_own_update" ON public.lesson_progress;
DROP POLICY IF EXISTS "progress_own_delete" ON public.lesson_progress;
DROP POLICY IF EXISTS "progress_admin" ON public.lesson_progress;

-- Students: SELECT own progress
CREATE POLICY "progress_own_select"
    ON public.lesson_progress FOR SELECT
    USING (user_id = auth.uid());

-- Students: INSERT own progress (WITH CHECK is required for INSERT)
CREATE POLICY "progress_own_insert"
    ON public.lesson_progress FOR INSERT
    WITH CHECK (user_id = auth.uid());

-- Students: UPDATE own progress
CREATE POLICY "progress_own_update"
    ON public.lesson_progress FOR UPDATE
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

-- Admins: full access
CREATE POLICY "progress_admin"
    ON public.lesson_progress FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role IN ('super_admin', 'teacher')
        )
    );


-- ============================================
-- 2. LESSON_NOTES — Students can manage their own notes
-- ============================================

CREATE TABLE IF NOT EXISTS public.lesson_notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    lesson_id UUID NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    position_seconds INT DEFAULT 0,
    scroll_position INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notes_user_lesson ON public.lesson_notes(user_id, lesson_id);

ALTER TABLE public.lesson_notes ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "notes_own" ON public.lesson_notes;
DROP POLICY IF EXISTS "notes_own_select" ON public.lesson_notes;
DROP POLICY IF EXISTS "notes_own_insert" ON public.lesson_notes;
DROP POLICY IF EXISTS "notes_own_update" ON public.lesson_notes;
DROP POLICY IF EXISTS "notes_own_delete" ON public.lesson_notes;

-- Students: full CRUD on own notes
CREATE POLICY "notes_own_select"
    ON public.lesson_notes FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "notes_own_insert"
    ON public.lesson_notes FOR INSERT
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "notes_own_update"
    ON public.lesson_notes FOR UPDATE
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "notes_own_delete"
    ON public.lesson_notes FOR DELETE
    USING (user_id = auth.uid());


-- ============================================
-- 3. LESSON_COMMENTS — Read all, write own
-- ============================================

CREATE TABLE IF NOT EXISTS public.lesson_comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    lesson_id UUID NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
    parent_id UUID REFERENCES public.lesson_comments(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_comments_lesson ON public.lesson_comments(lesson_id, created_at);
CREATE INDEX IF NOT EXISTS idx_comments_user ON public.lesson_comments(user_id);

ALTER TABLE public.lesson_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "comments_read" ON public.lesson_comments;
DROP POLICY IF EXISTS "comments_insert" ON public.lesson_comments;
DROP POLICY IF EXISTS "comments_delete" ON public.lesson_comments;

CREATE POLICY "comments_read"
    ON public.lesson_comments FOR SELECT USING (true);

CREATE POLICY "comments_insert"
    ON public.lesson_comments FOR INSERT
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "comments_delete"
    ON public.lesson_comments FOR DELETE
    USING (user_id = auth.uid());


-- ============================================
-- 4. RATINGS — Read all, write own
-- ============================================

CREATE TABLE IF NOT EXISTS public.ratings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    entity_type TEXT NOT NULL CHECK (entity_type IN ('course', 'lesson')),
    entity_id UUID NOT NULL,
    stars INT NOT NULL CHECK (stars >= 1 AND stars <= 5),
    feedback TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, entity_type, entity_id)
);

ALTER TABLE public.ratings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ratings_read" ON public.ratings;
DROP POLICY IF EXISTS "ratings_own" ON public.ratings;
DROP POLICY IF EXISTS "ratings_insert" ON public.ratings;
DROP POLICY IF EXISTS "ratings_update" ON public.ratings;
DROP POLICY IF EXISTS "ratings_delete" ON public.ratings;

CREATE POLICY "ratings_read"
    ON public.ratings FOR SELECT USING (true);

CREATE POLICY "ratings_insert"
    ON public.ratings FOR INSERT
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "ratings_update"
    ON public.ratings FOR UPDATE
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "ratings_delete"
    ON public.ratings FOR DELETE
    USING (user_id = auth.uid());


-- ============================================
-- 5. MESSAGES — SKIPPED (table does not exist yet)
-- ============================================


-- ============================================
-- 6. CERTIFICATES — Students read own, public verify, students create own
-- (Only runs if certificates table exists)
-- ============================================

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'certificates') THEN
    ALTER TABLE public.certificates ENABLE ROW LEVEL SECURITY;

    DROP POLICY IF EXISTS "Students read own certificates" ON public.certificates;
    DROP POLICY IF EXISTS "Public verify certificates" ON public.certificates;
    DROP POLICY IF EXISTS "Students create own certificates" ON public.certificates;
    DROP POLICY IF EXISTS "Admins manage certificates" ON public.certificates;

    CREATE POLICY "cert_student_select"
        ON public.certificates FOR SELECT
        USING (student_id = auth.uid());

    CREATE POLICY "cert_public_verify"
        ON public.certificates FOR SELECT
        USING (status = 'valid');

    CREATE POLICY "cert_student_insert"
        ON public.certificates FOR INSERT
        WITH CHECK (student_id = auth.uid());

    CREATE POLICY "cert_admin_all"
        ON public.certificates FOR ALL
        USING (
            EXISTS (
                SELECT 1 FROM public.profiles
                WHERE id = auth.uid() AND role = 'super_admin'
            )
        );
  END IF;
END $$;


-- ============================================
-- 7. LESSON_QUIZZES & QUESTIONS — Students can read enabled quizzes
-- ============================================

ALTER TABLE public.lesson_quizzes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "quizzes_student_read" ON public.lesson_quizzes;
DROP POLICY IF EXISTS "quizzes_public_read" ON public.lesson_quizzes;
DROP POLICY IF EXISTS "quizzes_admin" ON public.lesson_quizzes;

-- Students can read enabled quizzes
CREATE POLICY "quizzes_student_read"
    ON public.lesson_quizzes FOR SELECT
    USING (is_enabled = true);

-- Admins/teachers can do anything
CREATE POLICY "quizzes_admin"
    ON public.lesson_quizzes FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role IN ('super_admin', 'teacher')
        )
    );


ALTER TABLE public.lesson_quiz_questions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "quiz_questions_student_read" ON public.lesson_quiz_questions;
DROP POLICY IF EXISTS "quiz_questions_public_read" ON public.lesson_quiz_questions;
DROP POLICY IF EXISTS "quiz_questions_admin" ON public.lesson_quiz_questions;

-- Students can read questions for enabled quizzes
CREATE POLICY "quiz_questions_student_read"
    ON public.lesson_quiz_questions FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM public.lesson_quizzes
            WHERE id = lesson_quiz_questions.quiz_id
            AND is_enabled = true
        )
    );

-- Admins/teachers can do anything
CREATE POLICY "quiz_questions_admin"
    ON public.lesson_quiz_questions FOR ALL
    USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role IN ('super_admin', 'teacher')
        )
    );


-- ============================================
-- 8. Ensure update trigger exists for lesson_progress
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_progress_ts ON public.lesson_progress;
CREATE TRIGGER update_progress_ts BEFORE UPDATE ON public.lesson_progress
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_notes_ts ON public.lesson_notes;
CREATE TRIGGER update_notes_ts BEFORE UPDATE ON public.lesson_notes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- ============================================
-- DONE! All student RLS policies are fixed.
-- ============================================
