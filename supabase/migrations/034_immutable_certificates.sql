-- ============================================
-- IMMUTABLE CERTIFICATES
-- Migration: 034_immutable_certificates.sql
-- ============================================

-- Add new columns to certificates table
ALTER TABLE certificates 
ADD COLUMN IF NOT EXISTS version integer DEFAULT 1,
ADD COLUMN IF NOT EXISTS reissued_from_id uuid REFERENCES certificates(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS snapshot_json jsonb;

-- Add index for re-issue tracking
CREATE INDEX IF NOT EXISTS idx_certificates_reissued_from ON certificates(reissued_from_id);

-- Update status check constraint if needed (already exists in 030, but let's ensure 'revoked' is clear)
-- 030_certificate_rules.sql already set: CHECK (status IN ('draft', 'eligible', 'pending_approval', 'issued', 'revoked'))

-- Comment on columns for clarity
COMMENT ON COLUMN certificates.version IS 'Incremental version number for re-issued certificates';
COMMENT ON COLUMN certificates.reissued_from_id IS 'Reference to the previous version of this certificate';
COMMENT ON COLUMN certificates.snapshot_json IS 'Immutable snapshot of student and course data at time of issuance';

-- ============================================
-- RLS - Ensure admins can update (needed for re-issue/revoke)
-- ============================================

-- Existing policy "Admins manage certificates" already allows ALL.
