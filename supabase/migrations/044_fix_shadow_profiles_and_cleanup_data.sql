-- ==============================================================================
-- 044 FIX SHADOW PROFILES AND CLEANUP OLD DATA
-- 1. Removes the hard foreign key from profiles.id to auth.users.id to allow 
--    manually created teachers (shadow profiles) to exist before signup.
-- 2. Deactivates old/duplicate stages to ensure only the core curriculum shows.
-- ==============================================================================

-- 1. Remove strict foreign key constraint from profiles
-- This allows us to insert profiles with a random UUID, which then gets updated
-- to the real auth ID when the user eventually signs up (via our 043 trigger).
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;

-- We still want to refer to users, but let's make it optional if possible,
-- or just trust the trigger to link them. For most project structures like this,
-- removing the constraint is the most direct fix for "Shadow Profiles".


-- 2. Cleanup Stages
-- Deactivate all stages except the core ones seeded in 042
UPDATE public.stages 
SET is_active = false 
WHERE slug NOT IN ('kindergarten', 'primary', 'middle');

-- Ensure the core stages ARE active
UPDATE public.stages 
SET is_active = true 
WHERE slug IN ('kindergarten', 'primary', 'middle');


-- 3. Cleanup Subjects (Optional but good practice)
-- If there are subjects tied to inactive stages, they should also be inactive
UPDATE public.subjects
SET is_active = false
WHERE stage_id IN (SELECT id FROM public.stages WHERE is_active = false);


-- 4. Force cache reload
NOTIFY pgrst, 'reload schema';
