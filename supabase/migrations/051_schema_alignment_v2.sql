-- Migration 051: Comprehensive Schema Alignment (v2)
-- Purpose: Consolidate missing columns and relationships across core tables 
-- to satisfy PostgREST discovery and frontend requirements.

DO $$ 
BEGIN 
    -- 1. PROFILES ALIGNMENT
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'bio_ar') THEN
        ALTER TABLE public.profiles ADD COLUMN bio_ar TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'bio_en') THEN
        ALTER TABLE public.profiles ADD COLUMN bio_en TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'show_on_home') THEN
        ALTER TABLE public.profiles ADD COLUMN show_on_home BOOLEAN DEFAULT false;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'home_order') THEN
        ALTER TABLE public.profiles ADD COLUMN home_order INT DEFAULT 0;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'expertise_tags_ar') THEN
        ALTER TABLE public.profiles ADD COLUMN expertise_tags_ar TEXT[] DEFAULT '{}';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'profiles' AND column_name = 'expertise_tags_en') THEN
        ALTER TABLE public.profiles ADD COLUMN expertise_tags_en TEXT[] DEFAULT '{}';
    END IF;

    -- 2. STAGES ALIGNMENT
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'stages') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'stages' AND column_name = 'description_ar') THEN
            ALTER TABLE public.stages ADD COLUMN description_ar TEXT;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'stages' AND column_name = 'description_en') THEN
            ALTER TABLE public.stages ADD COLUMN description_en TEXT;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'stages' AND column_name = 'teaser_ar') THEN
            ALTER TABLE public.stages ADD COLUMN teaser_ar TEXT;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'stages' AND column_name = 'teaser_en') THEN
            ALTER TABLE public.stages ADD COLUMN teaser_en TEXT;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'stages' AND column_name = 'show_on_home') THEN
            ALTER TABLE public.stages ADD COLUMN show_on_home BOOLEAN DEFAULT false;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'stages' AND column_name = 'home_order') THEN
            ALTER TABLE public.stages ADD COLUMN home_order INT DEFAULT 0;
        END IF;
    END IF;

    -- 3. SUBJECTS ALIGNMENT
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'subjects' AND column_name = 'teaser_ar') THEN
        ALTER TABLE public.subjects ADD COLUMN teaser_ar TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'subjects' AND column_name = 'teaser_en') THEN
        ALTER TABLE public.subjects ADD COLUMN teaser_en TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'subjects' AND column_name = 'show_on_home') THEN
        ALTER TABLE public.subjects ADD COLUMN show_on_home BOOLEAN DEFAULT false;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'subjects' AND column_name = 'home_order') THEN
        ALTER TABLE public.subjects ADD COLUMN home_order INT DEFAULT 0;
    END IF;

    -- 4. LESSONS ALIGNMENT & DATA BACKFILL
    -- Add columns
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'lessons' AND column_name = 'subject_id') THEN
        ALTER TABLE public.lessons ADD COLUMN subject_id UUID REFERENCES public.subjects(id) ON DELETE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'lessons' AND column_name = 'created_by') THEN
        ALTER TABLE public.lessons ADD COLUMN created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'lessons' AND column_name = 'teaser_ar') THEN
        ALTER TABLE public.lessons ADD COLUMN teaser_ar TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'lessons' AND column_name = 'teaser_en') THEN
        ALTER TABLE public.lessons ADD COLUMN teaser_en TEXT;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'lessons' AND column_name = 'show_on_home') THEN
        ALTER TABLE public.lessons ADD COLUMN show_on_home BOOLEAN DEFAULT false;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'lessons' AND column_name = 'home_order') THEN
        ALTER TABLE public.lessons ADD COLUMN home_order INT DEFAULT 0;
    END IF;

    -- Indexes
    CREATE INDEX IF NOT EXISTS idx_lessons_subject_id ON public.lessons(subject_id);
    CREATE INDEX IF NOT EXISTS idx_lessons_created_by ON public.lessons(created_by);

    -- Data Backfill from Courses
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'courses' AND column_name = 'subject_id') THEN
        -- Backfill subject_id
        UPDATE public.lessons l
        SET subject_id = c.subject_id
        FROM public.courses c
        WHERE l.course_id = c.id AND l.subject_id IS NULL AND c.subject_id IS NOT NULL;

        -- Backfill created_by (from teacher_id of the course)
        UPDATE public.lessons l
        SET created_by = c.teacher_id
        FROM public.courses c
        WHERE l.course_id = c.id AND l.created_by IS NULL AND c.teacher_id IS NOT NULL;
    END IF;

    -- 5. HOME FEATURED RELATIONSHIPS (Explicit FKs for PostgREST)
    -- featured_subjects
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'home_featured_subjects') THEN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE table_name = 'home_featured_subjects' AND constraint_type = 'FOREIGN KEY'
            AND constraint_name = 'home_featured_subjects_subject_id_fkey'
        ) THEN
            ALTER TABLE public.home_featured_subjects 
            ADD CONSTRAINT home_featured_subjects_subject_id_fkey 
            FOREIGN KEY (subject_id) REFERENCES public.subjects(id) ON DELETE CASCADE;
        END IF;
    END IF;

    -- featured_lessons
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'home_featured_lessons') THEN
        IF NOT EXISTS (
            SELECT 1 FROM information_schema.table_constraints 
            WHERE table_name = 'home_featured_lessons' AND constraint_type = 'FOREIGN KEY'
            AND constraint_name = 'home_featured_lessons_lesson_id_fkey'
        ) THEN
            ALTER TABLE public.home_featured_lessons 
            ADD CONSTRAINT home_featured_lessons_lesson_id_fkey 
            FOREIGN KEY (lesson_id) REFERENCES public.lessons(id) ON DELETE CASCADE;
        END IF;
    END IF;

END $$;

-- 6. RELOAD SCHEMA CACHE
NOTIFY pgrst, 'reload schema';
