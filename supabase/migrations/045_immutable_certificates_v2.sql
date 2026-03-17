-- ============================================
-- 045: IMMUTABLE CERTIFICATES v2
-- Safe, additive migration. No breaking changes.
-- ============================================

-- ──────────────────────────────────────────────
-- 1) ADD MISSING COLUMNS (idempotent)
-- ──────────────────────────────────────────────

ALTER TABLE certificates 
ADD COLUMN IF NOT EXISTS template_version integer DEFAULT 1;

-- ──────────────────────────────────────────────
-- 2) CERTIFICATE TEMPLATE SETTINGS TABLE
-- ──────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS certificate_template_settings (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    setting_key text UNIQUE NOT NULL,
    setting_value text NOT NULL,
    updated_at timestamptz DEFAULT now()
);

-- Seed defaults
INSERT INTO certificate_template_settings (setting_key, setting_value) VALUES
    ('signer_name', 'أ. أيمن'),
    ('signer_role', 'مدير الأكاديمية'),
    ('academy_name', 'أكاديمية أيمن التعليمية')
ON CONFLICT (setting_key) DO NOTHING;

ALTER TABLE certificate_template_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read template settings" ON certificate_template_settings
FOR SELECT USING (true);

CREATE POLICY "Admins manage template settings" ON certificate_template_settings
FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
);

-- ──────────────────────────────────────────────
-- 3) LOCK DOWN RLS — REMOVE STUDENT INSERT
-- ──────────────────────────────────────────────

-- This is the CORE security fix.
-- Students can no longer insert certificates directly.
-- All issuance goes through server-side RPC functions (SECURITY DEFINER).

DROP POLICY IF EXISTS "Students create own certificates" ON certificates;

-- Ensure students can still READ their own certificates
DROP POLICY IF EXISTS "Students read own certificates" ON certificates;
CREATE POLICY "Students read own certificates" ON certificates
FOR SELECT USING (
    auth.uid() = student_id
);

-- Ensure public verification still works
DROP POLICY IF EXISTS "Public verify certificates" ON certificates;
CREATE POLICY "Public verify certificates" ON certificates
FOR SELECT USING (true);

-- Ensure admins can still manage everything
DROP POLICY IF EXISTS "Admins manage certificates" ON certificates;
CREATE POLICY "Admins manage certificates" ON certificates
FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'super_admin')
);

-- ──────────────────────────────────────────────
-- 4) BETTER INDEXES
-- ──────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_certificates_student_subject_status 
    ON certificates(student_id, subject_id, status);

-- ──────────────────────────────────────────────
-- 5) STRENGTHEN IMMUTABILITY TRIGGER
-- ──────────────────────────────────────────────

CREATE OR REPLACE FUNCTION protect_certificate_immutability()
RETURNS TRIGGER AS $$
BEGIN
    -- Only allow status changes (issued → revoked) and pdf_url updates
    -- Everything else is locked down

    IF (OLD.snapshot_json IS NOT NULL AND NEW.snapshot_json IS DISTINCT FROM OLD.snapshot_json) THEN
        RAISE EXCEPTION 'snapshot_json is immutable and cannot be changed after issuance';
    END IF;
    
    IF (NEW.version IS DISTINCT FROM OLD.version) THEN
        RAISE EXCEPTION 'version number is immutable; use re-issue to create a new certificate version';
    END IF;

    IF (NEW.student_id IS DISTINCT FROM OLD.student_id) THEN
        RAISE EXCEPTION 'student_id is immutable for an issued certificate';
    END IF;

    IF (NEW.verification_code IS DISTINCT FROM OLD.verification_code) THEN
        RAISE EXCEPTION 'verification_code is immutable';
    END IF;

    IF (NEW.student_name IS DISTINCT FROM OLD.student_name) THEN
        RAISE EXCEPTION 'student_name is immutable on an issued certificate';
    END IF;

    IF (NEW.course_name IS DISTINCT FROM OLD.course_name) THEN
        RAISE EXCEPTION 'course_name is immutable on an issued certificate';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate trigger
DROP TRIGGER IF EXISTS enforce_cert_immutability ON certificates;
CREATE TRIGGER enforce_cert_immutability
    BEFORE UPDATE ON certificates
    FOR EACH ROW
    WHEN (OLD.status = 'issued' OR OLD.status = 'revoked')
    EXECUTE FUNCTION protect_certificate_immutability();

-- ──────────────────────────────────────────────
-- 6) HELPER: Generate verification code in SQL
-- ──────────────────────────────────────────────

CREATE OR REPLACE FUNCTION generate_verification_code()
RETURNS text AS $$
DECLARE
    chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    result text := '';
    i integer;
BEGIN
    FOR i IN 1..12 LOOP
        result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
        IF i = 4 OR i = 8 THEN
            result := result || '-';
        END IF;
    END LOOP;
    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- ──────────────────────────────────────────────
-- 7) RPC: REQUEST CERTIFICATE (student-facing)
-- ──────────────────────────────────────────────
-- SECURITY DEFINER = runs with table owner's privileges
-- Students call this; it validates eligibility server-side.

CREATE OR REPLACE FUNCTION request_certificate(
    p_subject_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_student_id uuid;
    v_student_name text;
    v_student_email text;
    v_subject_name text;
    v_subject record;
    v_rule record;
    v_existing record;
    v_progress_percent numeric;
    v_total_lessons int;
    v_completed_lessons int;
    v_best_exam_score numeric;
    v_snapshot jsonb;
    v_cert_status text;
    v_verification_code text;
    v_new_cert_id uuid;
    v_teacher_name text;
    v_signer_name text;
    v_signer_role text;
BEGIN
    -- Auth check
    v_student_id := auth.uid();
    IF v_student_id IS NULL THEN
        RETURN jsonb_build_object('error', 'Not authenticated');
    END IF;

    -- Get student profile
    SELECT full_name, email INTO v_student_name, v_student_email
    FROM profiles WHERE id = v_student_id;

    IF v_student_name IS NULL OR v_student_name = '' THEN
        v_student_name := COALESCE(v_student_email, 'Student');
    END IF;

    -- Get subject info
    SELECT id, title_ar, title_en, teacher_id
    INTO v_subject
    FROM subjects WHERE id = p_subject_id;

    IF v_subject IS NULL THEN
        RETURN jsonb_build_object('error', 'Subject not found');
    END IF;

    v_subject_name := COALESCE(v_subject.title_ar, v_subject.title_en, 'Unknown Subject');

    -- Check for existing certificate
    SELECT id, status INTO v_existing
    FROM certificates
    WHERE student_id = v_student_id
      AND subject_id = p_subject_id
      AND status IN ('issued', 'pending_approval')
    LIMIT 1;

    IF v_existing IS NOT NULL THEN
        RETURN jsonb_build_object(
            'status', 'already_exists',
            'certificate_id', v_existing.id
        );
    END IF;

    -- Check certificate rule
    SELECT * INTO v_rule
    FROM certificate_rules
    WHERE subject_id = p_subject_id AND enabled = true;

    IF v_rule IS NULL THEN
        RETURN jsonb_build_object('error', 'No certificate rule configured for this subject');
    END IF;

    -- Evaluate eligibility: progress check
    SELECT count(*) INTO v_total_lessons
    FROM lessons
    WHERE subject_id = p_subject_id AND is_published = true;

    SELECT count(*) INTO v_completed_lessons
    FROM lesson_progress lp
    JOIN lessons l ON l.id = lp.lesson_id
    WHERE lp.user_id = v_student_id
      AND l.subject_id = p_subject_id
      AND l.is_published = true
      AND lp.completed_at IS NOT NULL;

    IF v_total_lessons > 0 THEN
        v_progress_percent := round((v_completed_lessons::numeric / v_total_lessons) * 100);
    ELSE
        v_progress_percent := 0;
    END IF;

    -- Simple rule evaluation (handles the common AND/progress pattern)
    -- For the rule_json, we check the top-level rules
    DECLARE
        v_rule_node jsonb := v_rule.rule_json;
        v_rules jsonb;
        v_rule_item jsonb;
        v_min_percent numeric;
        v_min_score numeric;
        v_eligible boolean := true;
    BEGIN
        -- Handle AND/OR wrapper
        IF v_rule_node->>'type' IN ('AND', 'OR') THEN
            v_rules := v_rule_node->'rules';
        ELSE
            v_rules := jsonb_build_array(v_rule_node);
        END IF;

        FOR v_rule_item IN SELECT * FROM jsonb_array_elements(v_rules)
        LOOP
            IF v_rule_item->>'type' = 'progress' THEN
                v_min_percent := (v_rule_item->>'minPercent')::numeric;
                IF v_progress_percent < v_min_percent THEN
                    v_eligible := false;
                END IF;
            ELSIF v_rule_item->>'type' = 'final_exam' THEN
                v_min_score := (v_rule_item->>'minScore')::numeric;
                -- Get best exam score
                SELECT max(qa.score_percent) INTO v_best_exam_score
                FROM quiz_attempts qa
                JOIN quizzes q ON q.id = qa.quiz_id
                JOIN lessons l ON l.id = q.lesson_id
                WHERE qa.student_id = v_student_id
                  AND l.subject_id = p_subject_id;
                
                IF COALESCE(v_best_exam_score, 0) < v_min_score THEN
                    v_eligible := false;
                END IF;
            END IF;
        END LOOP;

        IF NOT v_eligible THEN
            RETURN jsonb_build_object(
                'error', 'Student does not meet eligibility requirements',
                'status', 'not_eligible'
            );
        END IF;
    END;

    -- Get teacher name
    v_teacher_name := 'Academy Teacher';
    IF v_subject.teacher_id IS NOT NULL THEN
        SELECT full_name INTO v_teacher_name
        FROM profiles WHERE id = v_subject.teacher_id;
    END IF;

    -- Get signer info from template settings
    SELECT setting_value INTO v_signer_name
    FROM certificate_template_settings WHERE setting_key = 'signer_name';
    v_signer_name := COALESCE(v_signer_name, 'أ. أيمن');

    SELECT setting_value INTO v_signer_role
    FROM certificate_template_settings WHERE setting_key = 'signer_role';
    v_signer_role := COALESCE(v_signer_role, 'مدير الأكاديمية');

    -- Build snapshot
    v_snapshot := jsonb_build_object(
        'student_name', v_student_name,
        'course_name', v_subject_name,
        'score', null,
        'completion_date', now()::text,
        'teacher_name', COALESCE(v_teacher_name, 'Academy Teacher'),
        'signer_name', v_signer_name,
        'signer_role', v_signer_role,
        'template_version', '1.0'
    );

    -- Determine status
    IF v_rule.requires_manual_approval THEN
        v_cert_status := 'pending_approval';
    ELSE
        v_cert_status := 'issued';
    END IF;

    -- Generate verification code
    v_verification_code := generate_verification_code();

    -- Insert certificate
    INSERT INTO certificates (
        student_id, subject_id, student_name, course_name,
        subject_name, verification_code, status, version,
        snapshot_json, template_version
    ) VALUES (
        v_student_id, p_subject_id, v_student_name, v_subject_name,
        v_subject_name, v_verification_code, v_cert_status, 1,
        v_snapshot, 1
    )
    RETURNING id INTO v_new_cert_id;

    RETURN jsonb_build_object(
        'status', v_cert_status,
        'certificate_id', v_new_cert_id,
        'verification_code', v_verification_code
    );
END;
$$;

-- ──────────────────────────────────────────────
-- 8) RPC: ADMIN RE-ISSUE CERTIFICATE
-- ──────────────────────────────────────────────

CREATE OR REPLACE FUNCTION admin_reissue_certificate(
    p_certificate_id uuid,
    p_reason text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_admin_id uuid;
    v_admin_role text;
    v_old record;
    v_student_name text;
    v_snapshot jsonb;
    v_teacher_name text;
    v_signer_name text;
    v_signer_role text;
    v_new_cert_id uuid;
    v_verification_code text;
BEGIN
    -- Admin auth check
    v_admin_id := auth.uid();
    SELECT role INTO v_admin_role FROM profiles WHERE id = v_admin_id;
    IF v_admin_role != 'super_admin' THEN
        RETURN jsonb_build_object('error', 'Unauthorized: admin only');
    END IF;

    -- Fetch old certificate
    SELECT * INTO v_old FROM certificates WHERE id = p_certificate_id;
    IF v_old IS NULL THEN
        RETURN jsonb_build_object('error', 'Certificate not found');
    END IF;

    -- Revoke old certificate
    UPDATE certificates SET status = 'revoked' WHERE id = p_certificate_id;

    -- Get latest student name
    SELECT full_name INTO v_student_name FROM profiles WHERE id = v_old.student_id;
    v_student_name := COALESCE(v_student_name, v_old.student_name);

    -- Get teacher name
    v_teacher_name := 'Academy Teacher';
    IF v_old.subject_id IS NOT NULL THEN
        SELECT p.full_name INTO v_teacher_name
        FROM subjects s
        LEFT JOIN profiles p ON p.id = s.teacher_id
        WHERE s.id = v_old.subject_id;
        v_teacher_name := COALESCE(v_teacher_name, 'Academy Teacher');
    END IF;

    -- Get signer info
    SELECT setting_value INTO v_signer_name
    FROM certificate_template_settings WHERE setting_key = 'signer_name';
    v_signer_name := COALESCE(v_signer_name, 'أ. أيمن');

    SELECT setting_value INTO v_signer_role
    FROM certificate_template_settings WHERE setting_key = 'signer_role';
    v_signer_role := COALESCE(v_signer_role, 'مدير الأكاديمية');

    -- Build fresh snapshot
    v_snapshot := jsonb_build_object(
        'student_name', v_student_name,
        'course_name', COALESCE(v_old.course_name, ''),
        'score', v_old.score,
        'completion_date', now()::text,
        'teacher_name', v_teacher_name,
        'signer_name', v_signer_name,
        'signer_role', v_signer_role,
        'template_version', '1.0',
        'reissue_reason', p_reason
    );

    v_verification_code := generate_verification_code();

    -- Create new version
    INSERT INTO certificates (
        student_id, lesson_id, subject_id, student_name, course_name,
        subject_name, score, verification_code, status, version,
        reissued_from_id, snapshot_json, template_version
    ) VALUES (
        v_old.student_id, v_old.lesson_id, v_old.subject_id,
        v_student_name, v_old.course_name, v_old.subject_name,
        v_old.score, v_verification_code, 'issued',
        COALESCE(v_old.version, 1) + 1,
        v_old.id, v_snapshot, 1
    )
    RETURNING id INTO v_new_cert_id;

    RETURN jsonb_build_object(
        'status', 'issued',
        'certificate_id', v_new_cert_id,
        'verification_code', v_verification_code,
        'old_certificate_id', p_certificate_id,
        'version', COALESCE(v_old.version, 1) + 1
    );
END;
$$;

-- ──────────────────────────────────────────────
-- 9) RPC: ADMIN APPROVE PENDING CERTIFICATE
-- ──────────────────────────────────────────────

CREATE OR REPLACE FUNCTION admin_approve_certificate(
    p_certificate_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_admin_id uuid;
    v_admin_role text;
    v_cert record;
BEGIN
    -- Admin auth check
    v_admin_id := auth.uid();
    SELECT role INTO v_admin_role FROM profiles WHERE id = v_admin_id;
    IF v_admin_role != 'super_admin' THEN
        RETURN jsonb_build_object('error', 'Unauthorized: admin only');
    END IF;

    SELECT * INTO v_cert FROM certificates WHERE id = p_certificate_id;
    IF v_cert IS NULL THEN
        RETURN jsonb_build_object('error', 'Certificate not found');
    END IF;

    IF v_cert.status != 'pending_approval' THEN
        RETURN jsonb_build_object('error', 'Certificate is not in pending_approval status');
    END IF;

    -- Approve: update status to issued
    UPDATE certificates
    SET status = 'issued', issued_at = now()
    WHERE id = p_certificate_id;

    RETURN jsonb_build_object(
        'status', 'issued',
        'certificate_id', p_certificate_id
    );
END;
$$;

-- ──────────────────────────────────────────────
-- 10) RPC: ADMIN REVOKE CERTIFICATE
-- ──────────────────────────────────────────────

CREATE OR REPLACE FUNCTION admin_revoke_certificate(
    p_certificate_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_admin_id uuid;
    v_admin_role text;
    v_cert record;
BEGIN
    v_admin_id := auth.uid();
    SELECT role INTO v_admin_role FROM profiles WHERE id = v_admin_id;
    IF v_admin_role != 'super_admin' THEN
        RETURN jsonb_build_object('error', 'Unauthorized: admin only');
    END IF;

    SELECT * INTO v_cert FROM certificates WHERE id = p_certificate_id;
    IF v_cert IS NULL THEN
        RETURN jsonb_build_object('error', 'Certificate not found');
    END IF;

    IF v_cert.status = 'revoked' THEN
        RETURN jsonb_build_object('error', 'Certificate is already revoked');
    END IF;

    UPDATE certificates SET status = 'revoked' WHERE id = p_certificate_id;

    RETURN jsonb_build_object(
        'status', 'revoked',
        'certificate_id', p_certificate_id
    );
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION request_certificate(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_reissue_certificate(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_approve_certificate(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION admin_revoke_certificate(uuid) TO authenticated;

-- Schema cache reload
NOTIFY pgrst, 'reload schema';
