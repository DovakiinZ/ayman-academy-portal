-- ==============================================================================
-- 016 ADD MISSING DESCRIPTION COLUMNS TO STAGES
-- Fixes error: "Could not find the 'description_ar' column of 'stages'"
-- ==============================================================================

ALTER TABLE public.stages ADD COLUMN IF NOT EXISTS description_ar TEXT;
ALTER TABLE public.stages ADD COLUMN IF NOT EXISTS description_en TEXT;

-- Verify slug exists too
ALTER TABLE public.stages ADD COLUMN IF NOT EXISTS slug TEXT;

-- Verify RLS is still enabled (just safety check)
ALTER TABLE public.stages ENABLE ROW LEVEL SECURITY;
