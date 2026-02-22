-- ============================================
-- AYMAN ACADEMY - QUIZ SYSTEM SCHEMA
-- Migration: 005_quizzes.sql
-- ============================================

-- ============================================
-- TYPES
-- ============================================

DO $$ BEGIN
    CREATE TYPE quiz_attachment_type AS ENUM ('lesson', 'course');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE question_type AS ENUM ('mcq', 'true_false', 'multi_select', 'image_choice');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ============================================
-- QUIZZES TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.quizzes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    created_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    attachment_type quiz_attachment_type NOT NULL,
    lesson_id UUID REFERENCES public.lessons(id) ON DELETE CASCADE,
    course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE,
    title_ar TEXT NOT NULL,
    title_en TEXT,
    is_enabled BOOLEAN DEFAULT true,
    is_required BOOLEAN DEFAULT false,
    is_published BOOLEAN DEFAULT false,
    attempts_allowed INT DEFAULT 0, -- 0 = unlimited
    show_answers_after_submit BOOLEAN DEFAULT true,
    passing_score_percent INT, -- NULL = no passing score requirement
    randomize_questions BOOLEAN DEFAULT false,
    time_limit_minutes INT, -- NULL = no time limit
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    -- Ensure correct attachment based on type
    CONSTRAINT quiz_attachment_check CHECK (
        (attachment_type = 'lesson' AND lesson_id IS NOT NULL AND course_id IS NULL) OR
        (attachment_type = 'course' AND course_id IS NOT NULL AND lesson_id IS NULL)
    )
);

CREATE INDEX IF NOT EXISTS idx_quizzes_lesson ON public.quizzes(lesson_id) WHERE lesson_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_quizzes_course ON public.quizzes(course_id) WHERE course_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_quizzes_created_by ON public.quizzes(created_by);

-- ============================================
-- QUIZ QUESTIONS TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.quiz_questions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    quiz_id UUID NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
    question_type question_type NOT NULL DEFAULT 'mcq',
    question_text_ar TEXT NOT NULL,
    question_text_en TEXT,
    image_url TEXT, -- For image-based questions
    explanation_ar TEXT, -- Shown after submission
    explanation_en TEXT,
    points INT DEFAULT 1,
    order_index INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_questions_quiz ON public.quiz_questions(quiz_id);

-- ============================================
-- QUIZ OPTIONS TABLE (for MCQ, multi-select, image_choice)
-- ============================================

CREATE TABLE IF NOT EXISTS public.quiz_options (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    question_id UUID NOT NULL REFERENCES public.quiz_questions(id) ON DELETE CASCADE,
    option_text_ar TEXT NOT NULL,
    option_text_en TEXT,
    image_url TEXT, -- For image choice options
    is_correct BOOLEAN DEFAULT false,
    order_index INT DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_options_question ON public.quiz_options(question_id);

-- ============================================
-- QUIZ ATTEMPTS TABLE (student submissions)
-- ============================================

CREATE TABLE IF NOT EXISTS public.quiz_attempts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    quiz_id UUID NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
    student_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    score_percent INT NOT NULL,
    total_points INT NOT NULL,
    earned_points INT NOT NULL,
    answers JSONB NOT NULL, -- [{question_id, selected_options[], is_correct}]
    passed BOOLEAN, -- NULL if no passing score set
    started_at TIMESTAMPTZ DEFAULT NOW(),
    submitted_at TIMESTAMPTZ DEFAULT NOW(),
    time_spent_seconds INT
);

CREATE INDEX IF NOT EXISTS idx_attempts_quiz ON public.quiz_attempts(quiz_id);
CREATE INDEX IF NOT EXISTS idx_attempts_student ON public.quiz_attempts(student_id);

-- ============================================
-- UPDATED_AT TRIGGER
-- ============================================

CREATE TRIGGER update_quizzes_ts 
    BEFORE UPDATE ON public.quizzes 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quiz_attempts ENABLE ROW LEVEL SECURITY;

-- QUIZZES POLICIES

-- Super admin can do everything
CREATE POLICY "quizzes_admin" ON public.quizzes FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin')
);

-- Teachers can manage quizzes for their own courses/lessons
CREATE POLICY "quizzes_teacher_own" ON public.quizzes FOR ALL USING (
    created_by = auth.uid()
    OR EXISTS (
        SELECT 1 FROM public.courses c 
        WHERE c.id = quizzes.course_id AND c.teacher_id = auth.uid()
    )
    OR EXISTS (
        SELECT 1 FROM public.lessons l 
        JOIN public.courses c ON l.course_id = c.id 
        WHERE l.id = quizzes.lesson_id AND c.teacher_id = auth.uid()
    )
);

-- Students can view enabled+published quizzes
CREATE POLICY "quizzes_student_view" ON public.quizzes FOR SELECT USING (
    is_enabled = true AND is_published = true
);

-- QUESTIONS POLICIES

CREATE POLICY "questions_admin" ON public.quiz_questions FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin')
);

CREATE POLICY "questions_teacher_own" ON public.quiz_questions FOR ALL USING (
    EXISTS (
        SELECT 1 FROM public.quizzes q
        LEFT JOIN public.courses c ON c.id = q.course_id
        LEFT JOIN public.lessons l ON l.id = q.lesson_id
        LEFT JOIN public.courses lc ON l.course_id = lc.id
        WHERE q.id = quiz_questions.quiz_id 
        AND (q.created_by = auth.uid() OR c.teacher_id = auth.uid() OR lc.teacher_id = auth.uid())
    )
);

CREATE POLICY "questions_student_view" ON public.quiz_questions FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.quizzes q 
        WHERE q.id = quiz_questions.quiz_id 
        AND q.is_enabled = true AND q.is_published = true
    )
);

-- OPTIONS POLICIES

CREATE POLICY "options_admin" ON public.quiz_options FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin')
);

CREATE POLICY "options_teacher_own" ON public.quiz_options FOR ALL USING (
    EXISTS (
        SELECT 1 FROM public.quiz_questions qq
        JOIN public.quizzes q ON q.id = qq.quiz_id
        LEFT JOIN public.courses c ON c.id = q.course_id
        LEFT JOIN public.lessons l ON l.id = q.lesson_id
        LEFT JOIN public.courses lc ON l.course_id = lc.id
        WHERE qq.id = quiz_options.question_id 
        AND (q.created_by = auth.uid() OR c.teacher_id = auth.uid() OR lc.teacher_id = auth.uid())
    )
);

CREATE POLICY "options_student_view" ON public.quiz_options FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.quiz_questions qq
        JOIN public.quizzes q ON q.id = qq.quiz_id
        WHERE qq.id = quiz_options.question_id 
        AND q.is_enabled = true AND q.is_published = true
    )
);

-- ATTEMPTS POLICIES

CREATE POLICY "attempts_admin" ON public.quiz_attempts FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin')
);

-- Teachers can view attempts for their quizzes
CREATE POLICY "attempts_teacher_view" ON public.quiz_attempts FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.quizzes q
        LEFT JOIN public.courses c ON c.id = q.course_id
        LEFT JOIN public.lessons l ON l.id = q.lesson_id
        LEFT JOIN public.courses lc ON l.course_id = lc.id
        WHERE q.id = quiz_attempts.quiz_id 
        AND (q.created_by = auth.uid() OR c.teacher_id = auth.uid() OR lc.teacher_id = auth.uid())
    )
);

-- Students can manage their own attempts
CREATE POLICY "attempts_student_own" ON public.quiz_attempts FOR ALL USING (
    student_id = auth.uid()
);

-- ============================================
-- HELPER FUNCTION: Get quiz for lesson
-- ============================================

CREATE OR REPLACE FUNCTION public.get_lesson_quiz(p_lesson_id UUID)
RETURNS SETOF public.quizzes AS $$
BEGIN
    RETURN QUERY
    SELECT * FROM public.quizzes
    WHERE lesson_id = p_lesson_id
    AND is_enabled = true
    AND is_published = true
    LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- HELPER FUNCTION: Get quiz for course
-- ============================================

CREATE OR REPLACE FUNCTION public.get_course_quiz(p_course_id UUID)
RETURNS SETOF public.quizzes AS $$
BEGIN
    RETURN QUERY
    SELECT * FROM public.quizzes
    WHERE course_id = p_course_id
    AND is_enabled = true
    AND is_published = true
    LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- HELPER FUNCTION: Check if student passed quiz
-- ============================================

CREATE OR REPLACE FUNCTION public.check_quiz_passed(p_student_id UUID, p_quiz_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_quiz RECORD;
    v_attempt RECORD;
BEGIN
    -- Get quiz
    SELECT * INTO v_quiz FROM public.quizzes WHERE id = p_quiz_id;
    IF NOT FOUND THEN RETURN false; END IF;
    
    -- If no passing score, any attempt counts as "passed"
    IF v_quiz.passing_score_percent IS NULL THEN
        RETURN EXISTS (SELECT 1 FROM public.quiz_attempts WHERE quiz_id = p_quiz_id AND student_id = p_student_id);
    END IF;
    
    -- Check if any attempt passed
    RETURN EXISTS (
        SELECT 1 FROM public.quiz_attempts 
        WHERE quiz_id = p_quiz_id 
        AND student_id = p_student_id 
        AND passed = true
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- HELPER FUNCTION: Count student attempts
-- ============================================

CREATE OR REPLACE FUNCTION public.count_quiz_attempts(p_student_id UUID, p_quiz_id UUID)
RETURNS INT AS $$
BEGIN
    RETURN (
        SELECT COUNT(*)::INT FROM public.quiz_attempts 
        WHERE quiz_id = p_quiz_id AND student_id = p_student_id
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
