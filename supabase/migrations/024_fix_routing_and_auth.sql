-- Migration: Fix Stage Routing and Auth
-- Description: Adds NOT NULL to stage slugs, ensures unique indexing, and fixes RLS for public access.

-- 1. STAGES SLUG FIX
-- Ensure all stages have slugs (using title_en as fallback or id)
UPDATE public.stages
SET slug = lower(regexp_replace(title_en, '[^a-zA-Z0-9]+', '-', 'g'))
WHERE slug IS NULL AND title_en IS NOT NULL;

UPDATE public.stages
SET slug = id::text
WHERE slug IS NULL;

-- Add NOT NULL and UNIQUE if not already applied
ALTER TABLE public.stages ALTER COLUMN slug SET NOT NULL;

-- 2. RLS POLICIES FOR PUBLIC ACCESS
-- Ensure stages are readable by public (anon)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'stages' AND policyname = 'stages_public_read'
    ) THEN
        CREATE POLICY "stages_public_read" ON public.stages 
        FOR SELECT TO anon USING (is_active = true);
    END IF;
END $$;

-- Ensure subjects are readable by public (anon)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'subjects' AND policyname = 'subjects_public_read'
    ) THEN
        CREATE POLICY "subjects_public_read" ON public.subjects 
        FOR SELECT TO anon USING (is_active = true);
    END IF;
END $$;

-- Ensure lessons are readable by public (anon)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'lessons' AND policyname = 'lessons_public_read'
    ) THEN
        CREATE POLICY "lessons_public_read" ON public.lessons 
        FOR SELECT TO anon USING (is_published = true);
    END IF;
END $$;

-- 3. INDEXES
CREATE UNIQUE INDEX IF NOT EXISTS idx_stages_slug ON public.stages(slug);
