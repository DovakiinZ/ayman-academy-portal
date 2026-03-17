-- ============================================
-- FIX: Certificate RLS Policies
-- Drops ALL conflicting policies and creates clean ones.
-- Run this in Supabase SQL Editor.
-- ============================================

-- Drop ALL possible certificate policies (both naming conventions)
DROP POLICY IF EXISTS "Students read own certificates" ON certificates;
DROP POLICY IF EXISTS "Public verify certificates" ON certificates;
DROP POLICY IF EXISTS "Students create own certificates" ON certificates;
DROP POLICY IF EXISTS "Admins manage certificates" ON certificates;
DROP POLICY IF EXISTS "cert_student_select" ON certificates;
DROP POLICY IF EXISTS "cert_public_verify" ON certificates;
DROP POLICY IF EXISTS "cert_student_insert" ON certificates;
DROP POLICY IF EXISTS "cert_admin_all" ON certificates;

-- Ensure RLS is enabled
ALTER TABLE certificates ENABLE ROW LEVEL SECURITY;

-- 1. Students can read their own certificates
CREATE POLICY "Students read own certificates" ON certificates
FOR SELECT USING (
    auth.uid() = student_id
);

-- 2. Public verification (anyone can read any certificate for verify page)
CREATE POLICY "Public verify certificates" ON certificates
FOR SELECT USING (true);

-- 3. Admins + Teachers can manage certificates
CREATE POLICY "Admins manage certificates" ON certificates
FOR ALL USING (
    EXISTS (
        SELECT 1 FROM profiles
        WHERE id = auth.uid() AND role IN ('super_admin', 'teacher')
    )
);

-- Reload schema cache
NOTIFY pgrst, 'reload schema';
