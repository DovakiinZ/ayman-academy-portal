-- ============================================
-- 065: FIX student_request_reissue
-- ============================================
-- The version in 100_clean_rewrite.sql inserts the log row before the new
-- certificate exists, which fails the FK constraint
-- certificate_reissue_logs_new_certificate_id_fkey. It also returned the
-- wrong response shape and used status='pending_approval' (we no longer
-- require manual approval — see migration 064).
--
-- This rewrite:
--   1. Creates the new certificate first, THEN writes the log row.
--   2. Refreshes the snapshot with current student/subject/teacher data.
--   3. Returns { status, certificate_id, version, error } matching the
--      frontend in src/lib/certificateGenerator.ts.
--   4. Sets status = 'issued' immediately (no manual approval).
--
-- Run in Supabase SQL editor (or `supabase db push`).
-- ============================================

CREATE OR REPLACE FUNCTION public.student_request_reissue(
    p_certificate_id uuid
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_student_id        uuid;
    v_old               record;
    v_student_name      text;
    v_student_email     text;
    v_student_gender    text;
    v_student_stage     text;
    v_subject_name      text;
    v_teacher_name      text;
    v_signer_name       text;
    v_signer_role       text;
    v_snapshot          jsonb;
    v_verification_code text;
    v_new_cert_id       uuid;
    v_new_version       int;
BEGIN
    -- ── Auth ──
    v_student_id := auth.uid();
    IF v_student_id IS NULL THEN
        RETURN jsonb_build_object('error', 'Not authenticated');
    END IF;

    -- ── Fetch & validate old cert ──
    SELECT * INTO v_old FROM certificates WHERE id = p_certificate_id;
    IF v_old IS NULL THEN
        RETURN jsonb_build_object('error', 'Certificate not found');
    END IF;

    IF v_old.student_id <> v_student_id THEN
        RETURN jsonb_build_object('error', 'You do not own this certificate');
    END IF;

    IF v_old.status NOT IN ('issued', 'valid') THEN
        RETURN jsonb_build_object('error', 'Only issued certificates can be updated');
    END IF;

    -- A newer version already exists — refuse instead of chaining indefinitely.
    IF EXISTS (
        SELECT 1 FROM certificates
        WHERE reissued_from_id = p_certificate_id
          AND status IN ('issued', 'valid')
    ) THEN
        RETURN jsonb_build_object('error', 'A newer version of this certificate already exists');
    END IF;

    -- ── Latest profile data ──
    SELECT full_name, email,
           gender::text        AS gender,
           student_stage::text AS student_stage
    INTO v_student_name, v_student_email, v_student_gender, v_student_stage
    FROM profiles
    WHERE id = v_student_id;

    IF v_student_name IS NULL OR v_student_name = '' THEN
        v_student_name := COALESCE(v_student_email, 'Student');
    END IF;

    -- ── Subject & teacher (latest) ──
    v_subject_name := v_old.course_name;
    IF v_old.subject_id IS NOT NULL THEN
        SELECT COALESCE(s.title_ar, s.title_en, v_old.course_name)
        INTO v_subject_name
        FROM subjects s WHERE s.id = v_old.subject_id;

        SELECT p.full_name INTO v_teacher_name
        FROM subjects s
        LEFT JOIN profiles p ON p.id = s.teacher_id
        WHERE s.id = v_old.subject_id;
    END IF;

    -- ── Signer settings ──
    SELECT setting_value INTO v_signer_name
    FROM certificate_template_settings WHERE setting_key = 'signer_name';
    SELECT setting_value INTO v_signer_role
    FROM certificate_template_settings WHERE setting_key = 'signer_role';

    -- ── Build fresh snapshot ──
    v_snapshot := jsonb_build_object(
        'student_name',     v_student_name,
        'gender',           COALESCE(v_student_gender, ''),
        'student_stage',    COALESCE(v_student_stage, ''),
        'course_name',      v_subject_name,
        'teacher_name',     COALESCE(v_teacher_name, ''),
        'score',            v_old.score,
        'completion_date',  now()::date::text,
        'signer_name',      COALESCE(v_signer_name, 'أ. أيمن'),
        'signer_role',      COALESCE(v_signer_role, 'مدير الأكاديمية'),
        'template_version', '1',
        'reissue_reason',   'student_profile_update'
    );

    v_verification_code := upper(substring(replace(gen_random_uuid()::text, '-', '') from 1 for 12));
    v_new_version       := COALESCE(v_old.version, 1) + 1;

    -- ── 1) Revoke old cert ──
    UPDATE certificates SET status = 'revoked' WHERE id = p_certificate_id;

    -- ── 2) Insert NEW cert FIRST (so the FK in the log row is satisfied) ──
    INSERT INTO certificates (
        student_id, subject_id, student_name, course_name,
        subject_name, score, verification_code, status, version,
        reissued_from_id, snapshot_json, template_version, issued_at
    ) VALUES (
        v_old.student_id, v_old.subject_id,
        v_student_name, v_subject_name, v_old.subject_name,
        v_old.score, v_verification_code, 'issued', v_new_version,
        v_old.id, v_snapshot, 1, now()
    )
    RETURNING id INTO v_new_cert_id;

    -- ── 3) Log the reissue (FK now valid). Tolerate either log table name. ──
    BEGIN
        INSERT INTO certificate_reissue_logs (student_id, old_certificate_id, new_certificate_id)
        VALUES (v_student_id, p_certificate_id, v_new_cert_id);
    EXCEPTION
        WHEN undefined_table THEN
            -- Older schema used singular name
            INSERT INTO certificate_reissue_log (student_id, old_certificate_id, new_certificate_id)
            VALUES (v_student_id, p_certificate_id, v_new_cert_id);
    END;

    RETURN jsonb_build_object(
        'status',              'issued',
        'certificate_id',      v_new_cert_id,
        'verification_code',   v_verification_code,
        'old_certificate_id',  p_certificate_id,
        'version',             v_new_version,
        'error',               null
    );

EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object('error', SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION public.student_request_reissue(uuid) TO authenticated;

NOTIFY pgrst, 'reload schema';
