-- ==============================================================================
-- 063 ADD TEACHER SOCIAL LINKS
-- Adds a social_links JSONB column to storing teacher links
-- ==============================================================================

-- 1. Add social_links column to Profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS social_links JSONB DEFAULT '{
    "facebook": "",
    "twitter": "",
    "linkedin": "",
    "instagram": "",
    "website": ""
}'::jsonb;

-- 2. Update existing teachers to have the default value if null
UPDATE public.profiles
SET social_links = '{
    "facebook": "",
    "twitter": "",
    "linkedin": "",
    "instagram": "",
    "website": ""
}'::jsonb
WHERE role = 'teacher' AND (social_links IS NULL OR social_links = '{}'::jsonb);

-- 3. Notify PostgREST to refresh its schema cache
NOTIFY pgrst, 'reload schema';
