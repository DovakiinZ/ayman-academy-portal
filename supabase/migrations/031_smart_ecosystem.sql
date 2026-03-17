-- ============================================
-- SMART AI LEARNING ECOSYSTEM
-- Migration: 031_smart_ecosystem.sql
-- ============================================

-- ============================================
-- 1) EXPAND USER ROLES (add parent)
-- ============================================

-- Add 'parent' to the existing user_role ENUM type
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'parent';

-- ============================================
-- 2) GAMIFICATION: XP SYSTEM
-- ============================================

CREATE TABLE IF NOT EXISTS student_xp (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    student_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    event_type text NOT NULL CHECK (event_type IN (
        'lesson_complete', 'quiz_pass', 'streak_day',
        'assignment_submit', 'certificate_earned', 'badge_earned'
    )),
    points int NOT NULL DEFAULT 0,
    source_id uuid,  -- lesson_id, quiz_id, etc.
    created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_student_xp_student ON student_xp(student_id);
CREATE INDEX IF NOT EXISTS idx_student_xp_created ON student_xp(student_id, created_at DESC);

CREATE TABLE IF NOT EXISTS student_levels (
    student_id uuid PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
    total_xp int NOT NULL DEFAULT 0,
    current_level text NOT NULL DEFAULT 'beginner' CHECK (current_level IN (
        'beginner', 'learner', 'scholar', 'expert'
    )),
    streak_days int NOT NULL DEFAULT 0,
    last_activity_date date,
    updated_at timestamptz DEFAULT now()
);

-- ============================================
-- 3) GAMIFICATION: BADGES
-- ============================================

CREATE TABLE IF NOT EXISTS badges (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    key text NOT NULL UNIQUE,
    name_ar text NOT NULL,
    name_en text NOT NULL,
    description_ar text,
    description_en text,
    icon text NOT NULL DEFAULT '🏅',
    criteria_type text NOT NULL CHECK (criteria_type IN (
        'streak', 'score', 'courses_completed', 'speed', 'xp_total', 'custom'
    )),
    criteria_value int NOT NULL DEFAULT 0,
    sort_order int DEFAULT 0,
    created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS student_badges (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    student_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    badge_id uuid NOT NULL REFERENCES badges(id) ON DELETE CASCADE,
    earned_at timestamptz DEFAULT now(),
    CONSTRAINT unique_student_badge UNIQUE (student_id, badge_id)
);

CREATE INDEX IF NOT EXISTS idx_student_badges_student ON student_badges(student_id);

-- Seed default badges
INSERT INTO badges (key, name_ar, name_en, icon, criteria_type, criteria_value, sort_order)
VALUES
    ('streak_7', 'المثابر', '7-Day Streak', '🔥', 'streak', 7, 1),
    ('streak_30', 'الملتزم', '30-Day Streak', '💪', 'streak', 30, 2),
    ('high_scorer', 'المتفوق', 'High Scorer (90%+)', '⭐', 'score', 90, 3),
    ('courses_3', 'المتعدد', '3 Courses Done', '📚', 'courses_completed', 3, 4),
    ('fast_learner', 'سريع التعلم', 'Fast Learner', '⚡', 'speed', 5, 5),
    ('xp_1000', 'جامع النقاط', 'XP Collector (1000)', '💎', 'xp_total', 1000, 6),
    ('xp_5000', 'خبير', 'XP Master (5000)', '👑', 'xp_total', 5000, 7)
ON CONFLICT (key) DO NOTHING;

-- ============================================
-- 4) PARENT LINKS
-- ============================================

CREATE TABLE IF NOT EXISTS parent_links (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    parent_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    student_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    linked_at timestamptz DEFAULT now(),
    CONSTRAINT unique_parent_student UNIQUE (parent_id, student_id)
);

CREATE INDEX IF NOT EXISTS idx_parent_links_parent ON parent_links(parent_id);
CREATE INDEX IF NOT EXISTS idx_parent_links_student ON parent_links(student_id);

-- ============================================
-- 5) TEACHER EVALUATIONS CACHE
-- ============================================

CREATE TABLE IF NOT EXISTS teacher_evaluations (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    subject_id uuid NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    quality_score int NOT NULL DEFAULT 0,
    difficulty_balance_score int NOT NULL DEFAULT 0,
    engagement_score int NOT NULL DEFAULT 0,
    dropout_risk int NOT NULL DEFAULT 0,
    detected_issues jsonb DEFAULT '[]'::jsonb,
    recommendations jsonb DEFAULT '[]'::jsonb,
    evaluated_at timestamptz DEFAULT now(),
    CONSTRAINT unique_subject_eval UNIQUE (subject_id)
);

-- ============================================
-- 6) RLS POLICIES
-- ============================================

-- student_xp
ALTER TABLE student_xp ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Students see own XP" ON student_xp FOR SELECT USING (student_id = auth.uid());
CREATE POLICY "System inserts XP" ON student_xp FOR INSERT WITH CHECK (student_id = auth.uid());
CREATE POLICY "Admins manage XP" ON student_xp FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
);

-- student_levels
ALTER TABLE student_levels ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Students see own level" ON student_levels FOR SELECT USING (student_id = auth.uid());
CREATE POLICY "Students upsert own level" ON student_levels FOR INSERT WITH CHECK (student_id = auth.uid());
CREATE POLICY "Students update own level" ON student_levels FOR UPDATE USING (student_id = auth.uid());
CREATE POLICY "Admins manage levels" ON student_levels FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
);

-- badges
ALTER TABLE badges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone reads badges" ON badges FOR SELECT USING (true);
CREATE POLICY "Admins manage badges" ON badges FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
);

-- student_badges
ALTER TABLE student_badges ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Students see own badges" ON student_badges FOR SELECT USING (student_id = auth.uid());
CREATE POLICY "Students earn badges" ON student_badges FOR INSERT WITH CHECK (student_id = auth.uid());
CREATE POLICY "Admins manage student badges" ON student_badges FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
);

-- parent_links
ALTER TABLE parent_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Parents see own links" ON parent_links FOR SELECT USING (parent_id = auth.uid());
CREATE POLICY "Parents see linked student data" ON parent_links FOR SELECT USING (student_id = auth.uid());
CREATE POLICY "Admins manage links" ON parent_links FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
);

-- teacher_evaluations
ALTER TABLE teacher_evaluations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Teachers read evaluations" ON teacher_evaluations FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('teacher', 'super_admin'))
);
CREATE POLICY "System upserts evaluations" ON teacher_evaluations FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('teacher', 'super_admin'))
);
CREATE POLICY "System updates evaluations" ON teacher_evaluations FOR UPDATE USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('teacher', 'super_admin'))
);

-- Parent access to student data via RLS
-- Parents should be able to read lesson_progress and quiz_attempts for linked students
CREATE POLICY "Parents read linked student progress" ON lesson_progress FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM parent_links
        WHERE parent_links.parent_id = auth.uid()
        AND parent_links.student_id = lesson_progress.user_id
    )
);
