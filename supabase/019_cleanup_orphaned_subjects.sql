-- ==============================================================================
-- 019 CLEANUP ORPHANED SUBJECTS & FIX CONSTRAINT
-- Fixes error: "Key (stage_id)=(...) is not present in table 'stages'"
-- ==============================================================================

-- 1. CLEANUP ORPHANED DATA
-- Delete subjects that have a stage_id that DOES NOT exist in the stages table.
-- This is necessary because we cannot enforce a strict relationship on invalid data.

DELETE FROM public.subjects
WHERE stage_id IS NOT NULL 
AND stage_id NOT IN (SELECT id FROM public.stages);

-- Also handle case if column is still named 'level_id' (just in case 017 wasn't run fully)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='subjects' AND column_name='level_id') THEN
        DELETE FROM public.subjects
        WHERE level_id IS NOT NULL 
        AND level_id NOT IN (SELECT id FROM public.stages);
    END IF;
END $$;

-- 2. APPLY THE CONSTRAINT (Retry from 018)
-- Now that data is clean, this should pass.

ALTER TABLE public.subjects DROP CONSTRAINT IF EXISTS subjects_level_id_fkey;
ALTER TABLE public.subjects DROP CONSTRAINT IF EXISTS subjects_stage_id_fkey;

DO $$
BEGIN
    -- Check if column is 'stage_id'
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='subjects' AND column_name='stage_id') THEN
        ALTER TABLE public.subjects 
            ADD CONSTRAINT subjects_stage_id_fkey 
            FOREIGN KEY (stage_id) 
            REFERENCES public.stages(id)
            ON DELETE CASCADE;
            
    -- Fallback for level_id
    ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='subjects' AND column_name='level_id') THEN
        ALTER TABLE public.subjects 
            ADD CONSTRAINT subjects_level_id_fkey 
            FOREIGN KEY (level_id) 
            REFERENCES public.stages(id)
            ON DELETE CASCADE;
    END IF;
END $$;
