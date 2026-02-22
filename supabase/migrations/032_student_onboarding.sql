-- ============================================
-- STUDENT ONBOARDING COLUMNS
-- Migration: 032_student_onboarding.sql
-- ============================================

-- 1) Create ENUMs
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'student_gender') THEN
        CREATE TYPE student_gender AS ENUM ('male', 'female', 'unspecified');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'student_stage') THEN
        CREATE TYPE student_stage AS ENUM ('primary', 'middle', 'high');
    END IF;
END $$;

-- 2) Add columns to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS gender student_gender DEFAULT 'unspecified';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS student_stage student_stage;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS grade int;

-- grade should be 1-12
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_grade_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_grade_check
    CHECK (grade IS NULL OR (grade >= 1 AND grade <= 12));

-- 3) Allow students to update their own onboarding fields
CREATE POLICY "Students update own onboarding" ON profiles
    FOR UPDATE USING (id = auth.uid())
    WITH CHECK (id = auth.uid());
