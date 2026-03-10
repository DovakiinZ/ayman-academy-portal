-- ============================================================================
-- 048_dynamic_token_certificates.sql
-- Dynamic Token Certificates + Safe Student Re-issue
-- ============================================================================
-- Creates: render_mode column, certificate_reissue_log table,
--          student_request_reissue RPC with rate limiting
-- ============================================================================

-- ══════════════════════════════════════════════════════════════════════════════
-- 1. ADD render_mode COLUMN TO certificates
-- ══════════════════════════════════════════════════════════════════════════════

ALTER TABLE certificates
ADD COLUMN IF NOT EXISTS render_mode text NOT NULL DEFAULT 'official'
CHECK (render_mode IN ('official','live'));

-- ══════════════════════════════════════════════════════════════════════════════
-- 2. CERTIFICATE REISSUE LOG (rate limiting)
-- ══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.certificate_reissue_log (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    student_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    old_certificate_id uuid NOT NULL REFERENCES public.certificates(id) ON DELETE CASCADE,
    new_certificate_id uuid REFERENCES public.certificates(id) ON DELETE SET NULL,
    created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reissue_log_student_date
    ON public.certificate_reissue_log(student_id, created_at DESC);

ALTER TABLE public.certificate_reissue_log ENABLE ROW LEVEL SECURITY;

-- Students can read their own reissue log
DROP POLICY IF EXISTS "Students read own reissue log" ON public.certificate_reissue_log;
CREATE POLICY "Students read own reissue log"
    ON public.certificate_reissue_log FOR SELECT
    USING (student_id = auth.uid());

-- Admins manage all
DROP POLICY IF EXISTS "Admins manage reissue log" ON public.certificate_reissue_log;
CREATE POLICY "Admins manage reissue log"
    ON public.certificate_reissue_log FOR ALL
    USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin')
    );

GRANT SELECT ON public.certificate_reissue_log TO authenticated;

-- ══════════════════════════════════════════════════════════════════════════════
-- 3. UPDATE IMMUTABILITY TRIGGER — allow render_mode changes
-- ══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION protect_certificate_immutability()
RETURNS TRIGGER AS $$
BEGIN
    -- Only allow status changes (issued → revoked), pdf_url updates, and render_mode changes
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

    -- render_mode IS allowed to change (it's a UI preference, not official data)
    -- pdf_url IS allowed to change (generated lazily)
    -- status IS allowed to change (issued → revoked)

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate trigger (same as before, function updated above)
DROP TRIGGER IF EXISTS enforce_cert_immutability ON certificates;
CREATE TRIGGER enforce_cert_immutability
    BEFORE UPDATE ON certificates
    FOR EACH ROW
    WHEN (OLD.status = 'issued' OR OLD.status = 'revoked')
    EXECUTE FUNCTION protect_certificate_immutability();

-- ══════════════════════════════════════════════════════════════════════════════
-- 4. RPC: STUDENT REQUEST REISSUE
-- ══════════════════════════════════════════════════════════════════════════════
-- Student-facing reissue: re-validates eligibility, revokes old, creates new version
-- Rate limited to 2 reissues per student per day

CREATE OR REPLACE FUNCTION public.student_request_reissue(
    p_certificate_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_student_id uuid;
    v_old record;
    v_student_name text;
    v_student_email text;
    v_student_gender text;
    v_student_stage text;
    v_subject record;
    v_subject_name text;
    v_teacher_name text;
    v_signer_name text;
    v_signer_role text;
    v_snapshot jsonb;
    v_verification_code text;
    v_new_cert_id uuid;
    v_reissue_count int;
    v_total_lessons int;
    v_completed_lessons int;
    v_progress_percent numeric;
BEGIN
    -- ── Auth check ──
    v_student_id := auth.uid();
    IF v_student_id IS NULL THEN
        RETURN jsonb_build_object('error', 'Not authenticated');
    END IF;

    -- ── Fetch old certificate ──
    SELECT * INTO v_old FROM certificates WHERE id = p_certificate_id;
    IF v_old IS NULL THEN
        RETURN jsonb_build_object('error', 'Certificate not found');
    END IF;

    -- ── Validate ownership ──
    IF v_old.student_id != v_student_id THEN
        RETURN jsonb_build_object('error', 'You do not own this certificate');
    END IF;

    -- ── Validate cert is latest version (not already reissued) ──
    IF v_old.status = 'revoked' THEN
        RETURN jsonb_build_object('error', 'This certificate has already been superseded. Use the latest version.');
    END IF;

    IF v_old.status != 'issued' THEN
        RETURN jsonb_build_object('error', 'Only issued certificates can be updated');
    END IF;

    -- Check if a newer version already exists
    IF EXISTS (
        SELECT 1 FROM certificates 
        WHERE reissued_from_id = p_certificate_id 
        AND status IN ('issued', 'pending_approval')
    ) THEN
        RETURN jsonb_build_object('error', 'A newer version of this certificate already exists');
    END IF;

    -- ── Rate limit: max 2 reissues per student per day ──
    SELECT count(*) INTO v_reissue_count
    FROM certificate_reissue_log
    WHERE student_id = v_student_id
      AND created_at > now() - interval '24 hours';

    IF v_reissue_count >= 2 THEN
        RETURN jsonb_build_object(
            'error', 'Rate limit exceeded: maximum 2 certificate updates per day',
            'status', 'rate_limited'
        );
    END IF;

    -- ── Re-validate eligibility (course still completed) ──
    IF v_old.subject_id IS NOT NULL THEN
        SELECT count(*) INTO v_total_lessons
        FROM lessons WHERE subject_id = v_old.subject_id AND is_published = true;

        SELECT count(*) INTO v_completed_lessons
        FROM lesson_progress lp
        JOIN lessons l ON l.id = lp.lesson_id
        WHERE lp.user_id = v_student_id
          AND l.subject_id = v_old.subject_id
          AND l.is_published = true
          AND lp.completed_at IS NOT NULL;

        IF v_total_lessons > 0 THEN
            v_progress_percent := round((v_completed_lessons::numeric / v_total_lessons) * 100);
        ELSE
            v_progress_percent := 0;
        END IF;

        -- Check certificate rule still passes
        DECLARE
            v_rule record;
            v_rule_node jsonb;
            v_rules jsonb;
            v_rule_item jsonb;
            v_min_percent numeric;
        BEGIN
            SELECT * INTO v_rule
            FROM certificate_rules
            WHERE subject_id = v_old.subject_id AND enabled = true;

            IF v_rule IS NOT NULL THEN
                v_rule_node := v_rule.rule_json;
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
                            RETURN jsonb_build_object(
                                'error', 'Eligibility no longer met: progress requirement not satisfied',
                                'status', 'not_eligible'
                            );
                        END IF;
                    END IF;
                END LOOP;
            END IF;
        END;
    END IF;

    -- ── Get latest student profile ──
    SELECT full_name, email, gender, student_stage
    INTO v_student_name, v_student_email, v_student_gender, v_student_stage
    FROM profiles WHERE id = v_student_id;

    IF v_student_name IS NULL OR v_student_name = '' THEN
        v_student_name := COALESCE(v_student_email, 'Student');
    END IF;

    -- ── Get subject info ──
    v_subject_name := v_old.course_name;
    IF v_old.subject_id IS NOT NULL THEN
        SELECT s.title_ar, s.title_en
        INTO v_subject
        FROM subjects s WHERE s.id = v_old.subject_id;
        IF v_subject IS NOT NULL THEN
            v_subject_name := COALESCE(v_subject.title_ar, v_subject.title_en, v_old.course_name);
        END IF;
    END IF;

    -- ── Get teacher name ──
    v_teacher_name := 'Academy Teacher';
    IF v_old.subject_id IS NOT NULL THEN
        SELECT p.full_name INTO v_teacher_name
        FROM subjects s
        LEFT JOIN profiles p ON p.id = s.teacher_id
        WHERE s.id = v_old.subject_id;
        v_teacher_name := COALESCE(v_teacher_name, 'Academy Teacher');
    END IF;

    -- ── Get signer info ──
    SELECT setting_value INTO v_signer_name
    FROM certificate_template_settings WHERE setting_key = 'signer_name';
    v_signer_name := COALESCE(v_signer_name, 'أ. أيمن');

    SELECT setting_value INTO v_signer_role
    FROM certificate_template_settings WHERE setting_key = 'signer_role';
    v_signer_role := COALESCE(v_signer_role, 'مدير الأكاديمية');

    -- ── Revoke old certificate ──
    UPDATE certificates SET status = 'revoked' WHERE id = p_certificate_id;

    -- ── Build fresh snapshot ──
    v_snapshot := jsonb_build_object(
        'student_name', v_student_name,
        'gender', COALESCE(v_student_gender, 'unspecified'),
        'student_stage', v_student_stage,
        'course_name', v_subject_name,
        'score', v_old.score,
        'completion_date', now()::text,
        'teacher_name', COALESCE(v_teacher_name, 'Academy Teacher'),
        'signer_name', v_signer_name,
        'signer_role', v_signer_role,
        'template_version', '1.0',
        'reissue_reason', 'student_profile_update'
    );

    -- ── Generate verification code ──
    v_verification_code := generate_verification_code();

    -- ── Create new version ──
    INSERT INTO certificates (
        student_id, lesson_id, subject_id, student_name, course_name,
        subject_name, score, verification_code, status, version,
        reissued_from_id, snapshot_json, template_version, render_mode
    ) VALUES (
        v_old.student_id, v_old.lesson_id, v_old.subject_id,
        v_student_name, v_subject_name, v_old.subject_name,
        v_old.score, v_verification_code, 'issued',
        COALESCE(v_old.version, 1) + 1,
        v_old.id, v_snapshot, 1, 'official'
    )
    RETURNING id INTO v_new_cert_id;

    -- ── Log the reissue (for rate limiting) ──
    INSERT INTO certificate_reissue_log (student_id, old_certificate_id, new_certificate_id)
    VALUES (v_student_id, p_certificate_id, v_new_cert_id);

    RETURN jsonb_build_object(
        'status', 'issued',
        'certificate_id', v_new_cert_id,
        'verification_code', v_verification_code,
        'old_certificate_id', p_certificate_id,
        'version', COALESCE(v_old.version, 1) + 1
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.student_request_reissue(uuid) TO authenticated;

-- ══════════════════════════════════════════════════════════════════════════════
-- 5. HELPER: Find latest certificate version for a given cert chain
-- ══════════════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.get_latest_certificate_version(p_certificate_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_current_id uuid := p_certificate_id;
    v_next_id uuid;
    v_max_depth int := 50; -- safety limit
BEGIN
    LOOP
        SELECT id INTO v_next_id
        FROM certificates
        WHERE reissued_from_id = v_current_id
          AND status IN ('issued', 'pending_approval')
        LIMIT 1;

        IF v_next_id IS NULL THEN
            RETURN v_current_id;
        END IF;

        v_current_id := v_next_id;
        v_max_depth := v_max_depth - 1;
        IF v_max_depth <= 0 THEN
            RETURN v_current_id; -- safety exit
        END IF;
    END LOOP;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_latest_certificate_version(uuid) TO authenticated;

-- ══════════════════════════════════════════════════════════════════════════════
-- DONE
-- ══════════════════════════════════════════════════════════════════════════════

NOTIFY pgrst, 'reload schema';
