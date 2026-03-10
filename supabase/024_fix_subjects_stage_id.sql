-- ==============================================================================
-- 024 FIX SUBJECTS STAGE_ID RELATIONSHIP
-- Renames level_id to stage_id and updates foreign key to point to stages
-- ==============================================================================

DO $$
BEGIN
    -- 1. Rename column if it exists as level_id
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='subjects' AND column_name='level_id') THEN
        -- Drop old constraint first
        ALTER TABLE public.subjects DROP CONSTRAINT IF EXISTS subjects_level_id_fkey;
        
        -- Rename column
        ALTER TABLE public.subjects RENAME COLUMN level_id TO stage_id;
        
        -- Add new constraint
        ALTER TABLE public.subjects 
            ADD CONSTRAINT subjects_stage_id_fkey 
            FOREIGN KEY (stage_id) 
            REFERENCES public.stages(id)
            ON DELETE CASCADE;
            
        RAISE NOTICE 'Renamed level_id to stage_id and updated foreign key.';
    END IF;

    -- 2. Ensure the constraint exists if column is already named stage_id
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='subjects' AND column_name='stage_id') THEN
        IF NOT EXISTS (
            SELECT 1 
            FROM information_schema.table_constraints 
            WHERE constraint_name = 'subjects_stage_id_fkey' 
            AND table_name = 'subjects'
        ) THEN
            ALTER TABLE public.subjects 
                ADD CONSTRAINT subjects_stage_id_fkey 
                FOREIGN KEY (stage_id) 
                REFERENCES public.stages(id)
                ON DELETE CASCADE;
            RAISE NOTICE 'Added missing subjects_stage_id_fkey constraint.';
        END IF;
    END IF;
END $$;
