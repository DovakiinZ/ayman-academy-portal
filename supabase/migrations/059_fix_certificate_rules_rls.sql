-- Migration: 059_fix_certificate_rules_rls.sql
-- Description: Allow teachers to manage certificate rules for subjects they own.

-- Drop existing restrictive policy if needed (optional, but good for clarity if we want to consolidate)
-- DROP POLICY IF EXISTS "Admins manage certificate_rules" ON public.certificate_rules;

-- New consolidated policy for management
-- This covers INSERT, UPDATE, DELETE and redundant SELECT
DROP POLICY IF EXISTS "Teachers manage own certificate_rules" ON public.certificate_rules;
CREATE POLICY "Teachers manage own certificate_rules" ON public.certificate_rules
FOR ALL TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.subjects s
        WHERE s.id = certificate_rules.subject_id
        AND (s.teacher_id = auth.uid() OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin'))
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.subjects s
        WHERE s.id = certificate_rules.subject_id
        AND (s.teacher_id = auth.uid() OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin'))
    )
);

-- Note: "Students read certificate_rules" and "Teachers read certificate_rules" 
-- from migration 030 still exist and provide wider SELECT access if needed,
-- but this policy handles the management aspect for teachers.
