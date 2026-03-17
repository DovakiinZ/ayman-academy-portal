-- ==============================================================================
-- 018 FIX SUBJECTS FOREIGN KEY CONSTRAINT
-- Fixes error: "violates foreign key constraint 'subjects_level_id_fkey'"
-- The subjects table was referencing the old 'levels' table. We must point it to 'stages'.
-- ==============================================================================

-- 1. Drop the old constraint
ALTER TABLE public.subjects DROP CONSTRAINT IF EXISTS subjects_level_id_fkey;

-- 2. Add new constraint pointing to stages
-- Note: We assume column is named 'stage_id' (renamed in 017) or 'level_id' if 017 wasn't run
-- We'll accept stage_id as the target based on 017.

DO $$
BEGIN
    -- Check if column is 'stage_id'
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='subjects' AND column_name='stage_id') THEN
        ALTER TABLE public.subjects 
            ADD CONSTRAINT subjects_stage_id_fkey 
            FOREIGN KEY (stage_id) 
            REFERENCES public.stages(id)
            ON DELETE CASCADE;
            
    -- Fallback: if user didn't run 017, it might still be 'level_id'
    ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='subjects' AND column_name='level_id') THEN
        ALTER TABLE public.subjects 
            ADD CONSTRAINT subjects_level_id_fkey 
            FOREIGN KEY (level_id) 
            REFERENCES public.stages(id) -- Point to STAGES now!
            ON DELETE CASCADE;
            
        -- Ideally, we should rename it too as per 017, but let's stick to fixing the constraint logic first
        -- to ensure IDs match.
    END IF;
END $$;
