
-- 1) Add Homepage Sync columns to Profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS show_on_home BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS home_order INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS bio_ar TEXT,
ADD COLUMN IF NOT EXISTS bio_en TEXT;

-- 2) Add Homepage Sync columns to Subjects
ALTER TABLE public.subjects
ADD COLUMN IF NOT EXISTS show_on_home BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS home_order INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS teaser_ar TEXT,
ADD COLUMN IF NOT EXISTS teaser_en TEXT;

-- 3) Add Homepage Sync columns to Lessons
ALTER TABLE public.lessons
ADD COLUMN IF NOT EXISTS show_on_home BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS home_order INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS teaser_ar TEXT,
ADD COLUMN IF NOT EXISTS teaser_en TEXT;

-- 4) Create Quizzes tables
CREATE TABLE IF NOT EXISTS public.lesson_quizzes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lesson_id UUID NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
    title_ar TEXT,
    title_en TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(lesson_id)
);

CREATE TABLE IF NOT EXISTS public.lesson_quiz_questions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    quiz_id UUID NOT NULL REFERENCES public.lesson_quizzes(id) ON DELETE CASCADE,
    question_text_ar TEXT NOT NULL,
    question_text_en TEXT,
    question_type TEXT DEFAULT 'mcq', -- 'mcq' or 'true_false'
    options JSONB, -- Array of strings for choices
    correct_option_index INT, -- 0-based index
    explanation_ar TEXT,
    explanation_en TEXT,
    sort_order INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5) RLS Policies for Quizzes
ALTER TABLE public.lesson_quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lesson_quiz_questions ENABLE ROW LEVEL SECURITY;

-- Everyone can read quizzes if they can read the lesson
CREATE POLICY "quizzes_select" ON public.lesson_quizzes FOR SELECT USING (true);
CREATE POLICY "questions_select" ON public.lesson_quiz_questions FOR SELECT USING (true);

-- Admin can edit
CREATE POLICY "quizzes_admin" ON public.lesson_quizzes FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin')
);
CREATE POLICY "questions_admin" ON public.lesson_quiz_questions FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin')
);

-- 6) Ensure lesson_progress table exists (it was in the safe reset schema, but good to be sure)
CREATE TABLE IF NOT EXISTS public.lesson_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  lesson_id UUID NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
  progress_percent INT DEFAULT 0,
  last_position_seconds INT DEFAULT 0,
  completed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, lesson_id)
);

ALTER TABLE public.lesson_progress ENABLE ROW LEVEL SECURITY;

-- Progress Policies
DROP POLICY IF EXISTS "progress_own" ON public.lesson_progress;
CREATE POLICY "progress_own_select" ON public.lesson_progress FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "progress_own_insert" ON public.lesson_progress FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "progress_own_update" ON public.lesson_progress FOR UPDATE USING (user_id = auth.uid());
