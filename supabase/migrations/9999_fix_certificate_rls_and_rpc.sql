-- ============================================
-- FIX: Certificate schema, RLS, and RPC
-- Run this ENTIRE script in Supabase SQL Editor
-- ============================================

-- ── 1) Add missing columns (from migrations 034/045 that were never applied) ──
ALTER TABLE certificates ADD COLUMN IF NOT EXISTS version integer DEFAULT 1;
ALTER TABLE certificates ADD COLUMN IF NOT EXISTS reissued_from_id uuid REFERENCES certificates(id) ON DELETE SET NULL;
ALTER TABLE certificates ADD COLUMN IF NOT EXISTS snapshot_json jsonb;
ALTER TABLE certificates ADD COLUMN IF NOT EXISTS template_version integer DEFAULT 1;
ALTER TABLE certificates ADD COLUMN IF NOT EXISTS render_mode text;

-- ── 2) Fix status constraint (original only allowed 'valid'/'revoked') ──
ALTER TABLE certificates DROP CONSTRAINT IF EXISTS certificates_status_check;
ALTER TABLE certificates ADD CONSTRAINT certificates_status_check
    CHECK (status IN ('draft','eligible','pending_approval','issued','valid','revoked'));

-- ── 3) Create template settings table if missing ──
CREATE TABLE IF NOT EXISTS certificate_template_settings (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    setting_key text UNIQUE NOT NULL,
    setting_value text NOT NULL,
    updated_at timestamptz DEFAULT now()
);
INSERT INTO certificate_template_settings (setting_key, setting_value) VALUES
    ('signer_name', 'أ. أيمن'),
    ('signer_role', 'مدير الأكاديمية'),
    ('academy_name', 'أكاديمية أيمن التعليمية')
ON CONFLICT (setting_key) DO NOTHING;

-- ── 4) Fix RLS policies ──
DROP POLICY IF EXISTS "Students read own certificates" ON certificates;
DROP POLICY IF EXISTS "Public verify certificates" ON certificates;
DROP POLICY IF EXISTS "Students create own certificates" ON certificates;
DROP POLICY IF EXISTS "Admins manage certificates" ON certificates;
DROP POLICY IF EXISTS "cert_student_select" ON certificates;
DROP POLICY IF EXISTS "cert_public_verify" ON certificates;
DROP POLICY IF EXISTS "cert_student_insert" ON certificates;
DROP POLICY IF EXISTS "cert_admin_all" ON certificates;

ALTER TABLE certificates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students read own certificates" ON certificates
FOR SELECT USING (auth.uid() = student_id);

CREATE POLICY "Public verify certificates" ON certificates
FOR SELECT USING (true);

CREATE POLICY "Admins manage certificates" ON certificates
FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('super_admin', 'teacher'))
);

-- ── 5) Fix existing certificates with wrong student_id ──
UPDATE certificates c
SET student_id = (
    SELECT p.id FROM profiles p
    WHERE p.full_name = c.student_name AND p.role = 'student'
    LIMIT 1
)
WHERE c.student_id NOT IN (SELECT id FROM profiles WHERE role = 'student')
AND EXISTS (SELECT 1 FROM profiles p WHERE p.full_name = c.student_name AND p.role = 'student');

-- ── 6) Recreate issue_certificate RPC ──
CREATE OR REPLACE FUNCTION public.issue_certificate(
    p_student_id uuid,
    p_subject_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_caller_role      text;
    v_student          record;
    v_subject          record;
    v_total_lessons    int;
    v_completed        int;
    v_existing_cert    uuid;
    v_teacher_name     text;
    v_signer_name      text := 'أ. أيمن';
    v_signer_role      text := 'مدير الأكاديمية';
    v_verification     text;
    v_snapshot         jsonb;
    v_cert_id          uuid;
BEGIN
    -- Auth: only teachers or admins
    SELECT role INTO v_caller_role FROM profiles WHERE id = auth.uid();
    IF v_caller_role NOT IN ('teacher', 'super_admin') THEN
        RETURN jsonb_build_object('error', 'Permission denied: teachers and admins only');
    END IF;

    -- Fetch student (cast enums to text to avoid type errors)
    SELECT id, full_name, email, gender::text as gender, student_stage::text as student_stage
    INTO v_student
    FROM profiles
    WHERE id = p_student_id AND role = 'student';

    IF v_student IS NULL THEN
        RETURN jsonb_build_object('error', 'Student not found');
    END IF;

    -- Fetch subject
    SELECT title_ar, title_en, teacher_id
    INTO v_subject
    FROM subjects
    WHERE id = p_subject_id;

    IF v_subject IS NULL THEN
        RETURN jsonb_build_object('error', 'Subject not found');
    END IF;

    -- Check completion
    SELECT COUNT(*) INTO v_total_lessons
    FROM lessons WHERE subject_id = p_subject_id AND is_published = true;

    SELECT COUNT(*) INTO v_completed
    FROM lesson_progress lp
    JOIN lessons l ON l.id = lp.lesson_id
    WHERE lp.user_id = p_student_id
      AND l.subject_id = p_subject_id
      AND l.is_published = true
      AND lp.completed_at IS NOT NULL;

    -- Check for existing cert
    SELECT id INTO v_existing_cert
    FROM certificates
    WHERE student_id = p_student_id
      AND subject_id = p_subject_id
      AND status IN ('issued', 'pending_approval')
    LIMIT 1;

    IF v_existing_cert IS NOT NULL THEN
        RETURN jsonb_build_object(
            'status', 'already_exists',
            'certificate_id', v_existing_cert
        );
    END IF;

    -- Fetch teacher name
    IF v_subject.teacher_id IS NOT NULL THEN
        SELECT full_name INTO v_teacher_name
        FROM profiles WHERE id = v_subject.teacher_id;
    END IF;

    -- Fetch signer settings
    SELECT setting_value INTO v_signer_name
    FROM certificate_template_settings WHERE setting_key = 'signer_name';
    SELECT setting_value INTO v_signer_role
    FROM certificate_template_settings WHERE setting_key = 'signer_role';

    -- Build snapshot
    v_verification := upper(substring(replace(gen_random_uuid()::text, '-', '') from 1 for 12));

    v_snapshot := jsonb_build_object(
        'student_name',     COALESCE(v_student.full_name, v_student.email),
        'gender',           COALESCE(v_student.gender, ''),
        'student_stage',    COALESCE(v_student.student_stage, ''),
        'course_name',      COALESCE(v_subject.title_ar, ''),
        'teacher_name',     COALESCE(v_teacher_name, ''),
        'score',            CASE WHEN v_total_lessons > 0
                                 THEN round((v_completed::numeric / v_total_lessons) * 100)
                                 ELSE 100 END,
        'completion_date',  now()::date::text,
        'signer_name',      COALESCE(v_signer_name, 'أ. أيمن'),
        'signer_role',      COALESCE(v_signer_role, 'مدير الأكاديمية'),
        'template_version', '1'
    );

    -- Insert certificate
    INSERT INTO certificates (
        student_id, subject_id, student_name, course_name,
        subject_name, score, verification_code, status,
        version, snapshot_json, issued_at, template_version
    )
    VALUES (
        p_student_id,
        p_subject_id,
        COALESCE(v_student.full_name, v_student.email),
        COALESCE(v_subject.title_ar, ''),
        COALESCE(v_subject.title_ar, ''),
        CASE WHEN v_total_lessons > 0
             THEN round((v_completed::numeric / v_total_lessons) * 100)
             ELSE 100 END,
        v_verification,
        'issued',
        1,
        v_snapshot,
        now(),
        1
    )
    RETURNING id INTO v_cert_id;

    RETURN jsonb_build_object(
        'status',         'issued',
        'certificate_id', v_cert_id,
        'error',          null
    );

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('error', SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION public.issue_certificate(uuid, uuid) TO authenticated;

-- Reload schema cache
NOTIFY pgrst, 'reload schema';
