-- ============================================
-- 009: Student Engagement (Ratings & Comments)
-- ============================================

-- 1. Lesson Ratings
CREATE TABLE IF NOT EXISTS public.lesson_ratings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    lesson_id UUID NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, lesson_id) -- One rating per user per lesson
);

-- 2. Lesson Comments (Q&A)
CREATE TABLE IF NOT EXISTS public.lesson_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    lesson_id UUID NOT NULL REFERENCES public.lessons(id) ON DELETE CASCADE,
    parent_id UUID REFERENCES public.lesson_comments(id) ON DELETE CASCADE, -- For replies
    content TEXT NOT NULL,
    is_pinned BOOLEAN DEFAULT false, -- For instructor answers
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_ratings_lesson ON public.lesson_ratings(lesson_id);
CREATE INDEX IF NOT EXISTS idx_comments_lesson ON public.lesson_comments(lesson_id);
CREATE INDEX IF NOT EXISTS idx_comments_parent ON public.lesson_comments(parent_id);

-- RLS Policies

-- Ratings
ALTER TABLE public.lesson_ratings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Ratings viewable by everyone" ON public.lesson_ratings;
CREATE POLICY "Ratings viewable by everyone" ON public.lesson_ratings
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can rate lessons they access" ON public.lesson_ratings;
CREATE POLICY "Users can rate lessons they access" ON public.lesson_ratings
    FOR INSERT WITH CHECK (
        auth.uid() = user_id 
        -- logic to check access could differ, keeping it simple for now: own ID match
    );

DROP POLICY IF EXISTS "Users can update own ratings" ON public.lesson_ratings;
CREATE POLICY "Users can update own ratings" ON public.lesson_ratings
    FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own ratings" ON public.lesson_ratings;
CREATE POLICY "Users can delete own ratings" ON public.lesson_ratings
    FOR DELETE USING (auth.uid() = user_id);


-- Comments
ALTER TABLE public.lesson_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Comments viewable by everyone" ON public.lesson_comments;
CREATE POLICY "Comments viewable by everyone" ON public.lesson_comments
    FOR SELECT USING (true);

DROP POLICY IF EXISTS "Users can comment" ON public.lesson_comments;
CREATE POLICY "Users can comment" ON public.lesson_comments
    FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own comments" ON public.lesson_comments;
CREATE POLICY "Users can update own comments" ON public.lesson_comments
    FOR UPDATE USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own comments" ON public.lesson_comments;
CREATE POLICY "Users can delete own comments" ON public.lesson_comments
    FOR DELETE USING (auth.uid() = user_id OR 
        EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('teacher', 'super_admin'))
    );
