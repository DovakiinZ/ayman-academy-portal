-- ============================================
-- 064: SIMPLIFY CERTIFICATES — completion-only
-- ============================================
-- Rule: a student gets a certificate once they finish all published lessons
-- in a subject. No certificate_rules, no rule_json, no manual approval.
-- Students can claim their own certificate; teachers/admins can issue for any
-- student in their domain.
--
-- Run in Supabase SQL editor (or `supabase db push`).
-- ============================================

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
    v_caller_id        uuid;
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
    -- ── Auth ─────────────────────────────────────────────────────────
    v_caller_id := auth.uid();
    IF v_caller_id IS NULL THEN
        RETURN jsonb_build_object('error', 'Not authenticated');
    END IF;

    SELECT role INTO v_caller_role FROM profiles WHERE id = v_caller_id;

    -- Students may only claim their own certificate; teachers/admins may issue for anyone.
    IF v_caller_role = 'student' THEN
        IF v_caller_id <> p_student_id THEN
            RETURN jsonb_build_object('error', 'Students can only claim their own certificate');
        END IF;
    ELSIF v_caller_role NOT IN ('teacher', 'super_admin') THEN
        RETURN jsonb_build_object('error', 'Permission denied');
    END IF;

    -- ── Fetch student ────────────────────────────────────────────────
    SELECT id, full_name, email,
           gender::text         AS gender,
           student_stage::text  AS student_stage
    INTO v_student
    FROM profiles
    WHERE id = p_student_id AND role = 'student';

    IF v_student IS NULL THEN
        RETURN jsonb_build_object('error', 'Student not found');
    END IF;

    -- ── Fetch subject ────────────────────────────────────────────────
    SELECT title_ar, title_en, teacher_id
    INTO v_subject
    FROM subjects
    WHERE id = p_subject_id;

    IF v_subject IS NULL THEN
        RETURN jsonb_build_object('error', 'Subject not found');
    END IF;

    -- ── Completion check ────────────────────────────────────────────
    SELECT COUNT(*) INTO v_total_lessons
    FROM lessons
    WHERE subject_id = p_subject_id AND is_published = true;

    SELECT COUNT(*) INTO v_completed
    FROM lesson_progress lp
    JOIN lessons l ON l.id = lp.lesson_id
    WHERE lp.user_id      = p_student_id
      AND l.subject_id    = p_subject_id
      AND l.is_published  = true
      AND lp.completed_at IS NOT NULL;

    -- Students can only claim once 100% complete. Teachers/admins may override.
    IF v_caller_role = 'student' THEN
        IF v_total_lessons = 0 THEN
            RETURN jsonb_build_object(
                'error',  'No published lessons in this subject yet',
                'status', 'not_eligible'
            );
        END IF;
        IF v_completed < v_total_lessons THEN
            RETURN jsonb_build_object(
                'error',  'Complete all lessons before claiming your certificate',
                'status', 'not_eligible'
            );
        END IF;
    END IF;

    -- ── Existing certificate? ───────────────────────────────────────
    SELECT id INTO v_existing_cert
    FROM certificates
    WHERE student_id = p_student_id
      AND subject_id = p_subject_id
      AND status IN ('issued', 'valid', 'pending_approval')
    LIMIT 1;

    IF v_existing_cert IS NOT NULL THEN
        RETURN jsonb_build_object(
            'status',         'already_exists',
            'certificate_id', v_existing_cert,
            'error',          null
        );
    END IF;

    -- ── Teacher / signer info ───────────────────────────────────────
    IF v_subject.teacher_id IS NOT NULL THEN
        SELECT full_name INTO v_teacher_name
        FROM profiles WHERE id = v_subject.teacher_id;
    END IF;

    SELECT setting_value INTO v_signer_name
    FROM certificate_template_settings WHERE setting_key = 'signer_name';
    SELECT setting_value INTO v_signer_role
    FROM certificate_template_settings WHERE setting_key = 'signer_role';

    -- ── Build snapshot ──────────────────────────────────────────────
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

    -- ── Insert certificate ──────────────────────────────────────────
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

NOTIFY pgrst, 'reload schema';
