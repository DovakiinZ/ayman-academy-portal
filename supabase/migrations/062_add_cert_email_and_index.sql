-- ==============================================================================
-- 062 ADD STUDENT EMAIL TO CERTIFICATES (VERSION 3 - FIXED SYNTAX)
-- Purpose: Improves traceability and allows for robust profile merging.
-- Includes a fix for the PostgreSQL syntax error regarding DISABLE TRIGGER.
-- ==============================================================================

BEGIN;

-- 1. Ensure columns exist before any updates
DO $$
BEGIN
    -- Add student_email column if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'certificates' 
          AND column_name = 'student_email'
    ) THEN
        ALTER TABLE public.certificates ADD COLUMN student_email TEXT;
    END IF;

    -- Add snapshot_json column if it's missing (should have been added in 034)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
          AND table_name = 'certificates' 
          AND column_name = 'snapshot_json'
    ) THEN
        ALTER TABLE public.certificates ADD COLUMN snapshot_json JSONB;
    END IF;
END $$;

-- 2. Populate student_email (with safe trigger bypass)
DO $$
BEGIN
    -- Disable trigger if it exists (PostgreSQL doesn't support IF EXISTS in ALTER TABLE ... DISABLE TRIGGER)
    IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'enforce_cert_immutability') THEN
        ALTER TABLE public.certificates DISABLE TRIGGER enforce_cert_immutability;
    END IF;

    -- Perform the update
    UPDATE public.certificates c
    SET student_email = p.email
    FROM public.profiles p
    WHERE c.student_id = p.id
      AND c.student_email IS NULL;

    -- Re-enable trigger
    IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'enforce_cert_immutability') THEN
        ALTER TABLE public.certificates ENABLE TRIGGER enforce_cert_immutability;
    END IF;
END $$;

-- 3. Add index for faster lookups during merging
CREATE INDEX IF NOT EXISTS idx_certificates_student_email 
    ON public.certificates(student_email);

-- Force Cache Reload
NOTIFY pgrst, 'reload schema';

COMMIT;
