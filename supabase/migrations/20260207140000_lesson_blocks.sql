-- Add metadata columns to lessons
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS objectives_ar text;
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS objectives_en text;
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS prerequisites_ar text;
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS prerequisites_en text;
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS duration_minutes int;
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS cover_image_url text;
-- is_free_preview might already exist, check via content of previous migrations or just use IF NOT EXISTS
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS is_free_preview boolean DEFAULT false;
-- show_on_home and home_order might be in previous steps, ensuring they exist
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS show_on_home boolean DEFAULT false;
ALTER TABLE lessons ADD COLUMN IF NOT EXISTS home_order int DEFAULT 0;

-- 2. Lesson Sections (Optional grouping)
CREATE TABLE IF NOT EXISTS lesson_sections (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    lesson_id uuid REFERENCES lessons(id) ON DELETE CASCADE,
    title_ar text NOT NULL,
    title_en text,
    order_index int DEFAULT 0,
    created_at timestamptz DEFAULT now()
);

-- 3. Lesson Blocks (Rich content)
CREATE TABLE IF NOT EXISTS lesson_blocks (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    lesson_id uuid REFERENCES lessons(id) ON DELETE CASCADE,
    section_id uuid REFERENCES lesson_sections(id) ON DELETE SET NULL,
    type text NOT NULL CHECK (type IN ('rich_text','video','image','file','link','tip','warning','example','exercise','qa','equation')),
    title_ar text,
    title_en text,
    content_ar text, -- for rich_text/tip/warning/example/exercise
    content_en text,
    url text,        -- for video/link/file/image
    metadata jsonb DEFAULT '{}'::jsonb, -- {provider, duration, thumbnail, file_size, mime, etc}
    order_index int DEFAULT 0,
    is_published boolean DEFAULT true,
    created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lesson_blocks_lesson_id ON lesson_blocks(lesson_id);
CREATE INDEX IF NOT EXISTS idx_lesson_blocks_section_id ON lesson_blocks(section_id);
CREATE INDEX IF NOT EXISTS idx_lesson_blocks_order ON lesson_blocks(order_index);

-- 4. Lesson Quizzes (One per lesson for now)
CREATE TABLE IF NOT EXISTS lesson_quizzes (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    lesson_id uuid REFERENCES lessons(id) ON DELETE CASCADE UNIQUE, -- One quiz per lesson
    is_enabled boolean DEFAULT true,
    unlock_after_percent int DEFAULT 90,
    passing_score int DEFAULT 70,
    created_at timestamptz DEFAULT now()
);

-- 5. Quiz Questions
CREATE TABLE IF NOT EXISTS lesson_quiz_questions (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    quiz_id uuid REFERENCES lesson_quizzes(id) ON DELETE CASCADE,
    type text CHECK (type IN ('mcq','true_false','multi_select')),
    question_ar text NOT NULL,
    question_en text,
    options jsonb NOT NULL, -- Array of options {id, text_ar, text_en}
    correct_answer jsonb NOT NULL, -- ID of correct option(s)
    explanation_ar text,
    explanation_en text,
    order_index int DEFAULT 0,
    created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_quiz_questions_quiz_id ON lesson_quiz_questions(quiz_id);

-- RLS POLICIES

-- Enable RLS
ALTER TABLE lesson_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE lesson_blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE lesson_quizzes ENABLE ROW LEVEL SECURITY;
ALTER TABLE lesson_quiz_questions ENABLE ROW LEVEL SECURITY;

-- Helper policy for "Teacher owns the lesson"
-- (Simulated for now, usually checks if user is super_admin or creator)

-- SECTIONS
CREATE POLICY "Public read published sections" ON lesson_sections
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM lessons 
        WHERE lessons.id = lesson_sections.lesson_id 
        AND lessons.is_published = true
    )
);

CREATE POLICY "Admins/Teachers manage sections" ON lesson_sections
FOR ALL USING (
    auth.uid() IN (SELECT id FROM profiles WHERE role IN ('super_admin', 'teacher'))
);

-- BLOCKS
CREATE POLICY "Public read published blocks" ON lesson_blocks
FOR SELECT USING (
    is_published = true AND
    EXISTS (
        SELECT 1 FROM lessons 
        WHERE lessons.id = lesson_blocks.lesson_id 
        AND lessons.is_published = true
    )
);

CREATE POLICY "Admins/Teachers manage blocks" ON lesson_blocks
FOR ALL USING (
    auth.uid() IN (SELECT id FROM profiles WHERE role IN ('super_admin', 'teacher'))
);

-- QUIZZES
CREATE POLICY "Public read quizzes" ON lesson_quizzes
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM lessons 
        WHERE lessons.id = lesson_quizzes.lesson_id 
        AND lessons.is_published = true
    )
);

CREATE POLICY "Admins/Teachers manage quizzes" ON lesson_quizzes
FOR ALL USING (
    auth.uid() IN (SELECT id FROM profiles WHERE role IN ('super_admin', 'teacher'))
);

-- QUESTIONS
CREATE POLICY "Public read questions" ON lesson_quiz_questions
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM lesson_quizzes 
        JOIN lessons ON lessons.id = lesson_quizzes.lesson_id
        WHERE lesson_quizzes.id = lesson_quiz_questions.quiz_id 
        AND lessons.is_published = true
    )
);

CREATE POLICY "Admins/Teachers manage questions" ON lesson_quiz_questions
FOR ALL USING (
    auth.uid() IN (SELECT id FROM profiles WHERE role IN ('super_admin', 'teacher'))
);
