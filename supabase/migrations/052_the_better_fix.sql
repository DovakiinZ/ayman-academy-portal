-- Migration 052: The Better Fix
-- Purpose: 
-- 1. Relax profile FK constraints to allow pre-registration "shadow profiles"
-- 2. Explicitly rebuild all PostgREST relationships
-- 3. Ensure full metadata alignment across core tables

BEGIN;

-- ============================================
-- 1. PROFILES: RELAX CONSTRAINTS & ALIGN COLUMNS
-- ============================================

-- Drop the strict FK to auth.users if it exists (allows shadow profiles)
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;

-- Ensure email is unique for linking during first login correctly
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'profiles_email_key') THEN
        ALTER TABLE public.profiles ADD CONSTRAINT profiles_email_key UNIQUE (email);
    END IF;
END $$;

-- Align columns for Profiles
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'bio_ar') THEN
        ALTER TABLE public.profiles ADD COLUMN bio_ar TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'bio_en') THEN
        ALTER TABLE public.profiles ADD COLUMN bio_en TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'show_on_home') THEN
        ALTER TABLE public.profiles ADD COLUMN show_on_home BOOLEAN DEFAULT false;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'home_order') THEN
        ALTER TABLE public.profiles ADD COLUMN home_order INT DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'expertise_tags_ar') THEN
        ALTER TABLE public.profiles ADD COLUMN expertise_tags_ar TEXT[] DEFAULT '{}';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'expertise_tags_en') THEN
        ALTER TABLE public.profiles ADD COLUMN expertise_tags_en TEXT[] DEFAULT '{}';
    END IF;
END $$;

-- ============================================
-- 2. EXPLICIT RELATIONSHIP REBUILD
-- ============================================

-- Ensure Lessons has subject_id and created_by
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lessons' AND column_name = 'subject_id') THEN
        ALTER TABLE public.lessons ADD COLUMN subject_id UUID REFERENCES public.subjects(id) ON DELETE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lessons' AND column_name = 'created_by') THEN
        ALTER TABLE public.lessons ADD COLUMN created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;
    END IF;
END $$;

-- Rebuild Featured Subjects FK
ALTER TABLE public.home_featured_subjects DROP CONSTRAINT IF EXISTS home_featured_subjects_subject_id_fkey;
ALTER TABLE public.home_featured_subjects 
ADD CONSTRAINT home_featured_subjects_subject_id_fkey 
FOREIGN KEY (subject_id) REFERENCES public.subjects(id) ON DELETE CASCADE;

-- Rebuild Featured Lessons FK
ALTER TABLE public.home_featured_lessons DROP CONSTRAINT IF EXISTS home_featured_lessons_lesson_id_fkey;
ALTER TABLE public.home_featured_lessons 
ADD CONSTRAINT home_featured_lessons_lesson_id_fkey 
FOREIGN KEY (lesson_id) REFERENCES public.lessons(id) ON DELETE CASCADE;

-- ============================================
-- 3. METADATA FIELD ALIGNMENT (Stages, Subjects, Lessons)
-- ============================================

-- Stages
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'stages' AND column_name = 'description_ar') THEN
        ALTER TABLE public.stages ADD COLUMN description_ar TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'stages' AND column_name = 'teaser_ar') THEN
        ALTER TABLE public.stages ADD COLUMN teaser_ar TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'stages' AND column_name = 'show_on_home') THEN
        ALTER TABLE public.stages ADD COLUMN show_on_home BOOLEAN DEFAULT false;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'stages' AND column_name = 'home_order') THEN
        ALTER TABLE public.stages ADD COLUMN home_order INT DEFAULT 0;
    END IF;
END $$;

-- Subjects
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subjects' AND column_name = 'teaser_ar') THEN
        ALTER TABLE public.subjects ADD COLUMN teaser_ar TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subjects' AND column_name = 'show_on_home') THEN
        ALTER TABLE public.subjects ADD COLUMN show_on_home BOOLEAN DEFAULT false;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'subjects' AND column_name = 'home_order') THEN
        ALTER TABLE public.subjects ADD COLUMN home_order INT DEFAULT 0;
    END IF;
END $$;

-- Lessons
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lessons' AND column_name = 'teaser_ar') THEN
        ALTER TABLE public.lessons ADD COLUMN teaser_ar TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lessons' AND column_name = 'show_on_home') THEN
        ALTER TABLE public.lessons ADD COLUMN show_on_home BOOLEAN DEFAULT false;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'lessons' AND column_name = 'home_order') THEN
        ALTER TABLE public.lessons ADD COLUMN home_order INT DEFAULT 0;
    END IF;
END $$;

-- ============================================
-- 4. CACHE RELOAD
-- ============================================
NOTIFY pgrst, 'reload schema';

COMMIT;
