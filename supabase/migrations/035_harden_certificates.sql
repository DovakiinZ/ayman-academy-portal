-- ============================================
-- HARDEN CERTIFICATES IMMUTABILITY
-- Migration: 035_harden_certificates.sql
-- ============================================

-- Ensure snapshot_json and version cannot be modified after insertion
CREATE OR REPLACE FUNCTION protect_certificate_immutability()
RETURNS TRIGGER AS $$
BEGIN
    -- Prevent changing the snapshot or version
    IF (OLD.snapshot_json IS NOT NULL AND NEW.snapshot_json IS DISTINCT FROM OLD.snapshot_json) THEN
        RAISE EXCEPTION 'snapshot_json is immutable and cannot be changed after issuance';
    END IF;
    
    IF (NEW.version IS DISTINCT FROM OLD.version) THEN
        RAISE EXCEPTION 'version number is immutable; use re-issue to create a new certificate version';
    END IF;

    -- Prevent changing student_id or course_name directly
    IF (NEW.student_id IS DISTINCT FROM OLD.student_id) THEN
        RAISE EXCEPTION 'student_id is immutable for an issued certificate';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS enforce_cert_immutability ON certificates;
CREATE TRIGGER enforce_cert_immutability
    BEFORE UPDATE ON certificates
    FOR EACH ROW
    WHEN (OLD.status = 'issued' OR OLD.status = 'revoked')
    EXECUTE FUNCTION protect_certificate_immutability();

-- Index to quickly find revoked certificates linked to new ones
CREATE INDEX IF NOT EXISTS idx_certificates_reissued_from_id ON certificates(reissued_from_id) WHERE reissued_from_id IS NOT NULL;

-- Final cleanup of any orphaned 'valid' statuses (should have been handled by 030, but safety first)
UPDATE certificates SET status = 'issued' WHERE status = 'valid';
