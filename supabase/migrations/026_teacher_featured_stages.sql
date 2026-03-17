-- Migration: Teacher Featured Stages
-- Description: Adds a column to store featured/assigned stages for teachers

-- 1. ADD COLUMN
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS featured_stages UUID[] DEFAULT '{}';

-- 2. ADD INDEX for performance
CREATE INDEX IF NOT EXISTS idx_profiles_featured_stages ON public.profiles USING GIN (featured_stages);

-- 3. COMMENT for clarity
COMMENT ON COLUMN public.profiles.featured_stages IS 'Array of stage IDs assigned to or featured by the teacher';
