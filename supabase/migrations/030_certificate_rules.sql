-- ============================================
-- CERTIFICATE RULES & STATUS EVOLUTION
-- Migration: 030_certificate_rules.sql
-- ============================================

-- ============================================
-- 1) CERTIFICATE RULES TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS certificate_rules (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    subject_id uuid NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
    enabled boolean DEFAULT false,
    rule_json jsonb NOT NULL DEFAULT '{"type":"AND","rules":[{"type":"progress","minPercent":100}]}',
    requires_manual_approval boolean DEFAULT false,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    CONSTRAINT unique_subject_rule UNIQUE (subject_id)
);

CREATE INDEX IF NOT EXISTS idx_certificate_rules_subject ON certificate_rules(subject_id);

-- ============================================
-- 2) EVOLVE CERTIFICATES TABLE
-- ============================================

-- Step A: Drop ALL existing check constraints on certificates.status (handles any name)
DO $$
DECLARE
    r RECORD;
BEGIN
    FOR r IN
        SELECT con.conname
        FROM pg_constraint con
        JOIN pg_class rel ON rel.oid = con.conrelid
        JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
        WHERE rel.relname = 'certificates'
          AND nsp.nspname = 'public'
          AND con.contype = 'c'
          AND pg_get_constraintdef(con.oid) LIKE '%status%'
    LOOP
        EXECUTE format('ALTER TABLE certificates DROP CONSTRAINT IF EXISTS %I', r.conname);
    END LOOP;
END $$;

-- Step B: Migrate existing 'valid' → 'issued' (no constraint blocks this now)
UPDATE certificates SET status = 'issued' WHERE status = 'valid';

-- Step C: Add new constraint
ALTER TABLE certificates ADD CONSTRAINT certificates_status_check
    CHECK (status IN ('draft', 'eligible', 'pending_approval', 'issued', 'revoked'));

-- Prevent duplicate issued certificates per student+subject
CREATE UNIQUE INDEX IF NOT EXISTS idx_certificates_unique_issued
    ON certificates(student_id, subject_id)
    WHERE status = 'issued';

-- ============================================
-- 3) RLS FOR CERTIFICATE_RULES
-- ============================================

ALTER TABLE certificate_rules ENABLE ROW LEVEL SECURITY;

-- Admins can do everything
CREATE POLICY "Admins manage certificate_rules" ON certificate_rules
FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
);

-- Students can read rules (needed to display checklist)
CREATE POLICY "Students read certificate_rules" ON certificate_rules
FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'student')
);

-- Teachers can read rules
CREATE POLICY "Teachers read certificate_rules" ON certificate_rules
FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'teacher')
);

-- ============================================
-- 4) UPDATED_AT TRIGGER
-- ============================================

CREATE OR REPLACE FUNCTION update_certificate_rules_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_certificate_rules_ts
    BEFORE UPDATE ON certificate_rules
    FOR EACH ROW EXECUTE FUNCTION update_certificate_rules_updated_at();
