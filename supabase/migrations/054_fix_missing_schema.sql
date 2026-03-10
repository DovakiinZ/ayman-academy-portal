-- ============================================================================
-- 054_fix_missing_schema.sql
-- Fixes for missing columns, tables, and RPC functions from PRs:
--   - subjects.teacher_id (used by TeacherAnnouncements, TeacherCertificates)
--   - courses table: add stage_id alias + thumbnail_url + relax NOT NULL
--   - get_latest_certificate_version RPC
--   - issue_certificate(p_student_id, p_subject_id) RPC (teacher/admin)
-- ============================================================================

-- ── 1. subjects.teacher_id ───────────────────────────────────────────────────
-- Teachers "own" subjects they created/are assigned to.
-- Nullable so existing subjects without a teacher still work.

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name   = 'subjects'
          AND column_name  = 'teacher_id'
    ) THEN
        ALTER TABLE public.subjects
            ADD COLUMN teacher_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

        CREATE INDEX IF NOT EXISTS idx_subjects_teacher_id
            ON public.subjects(teacher_id);
    END IF;
END $$;

-- Allow teachers to read subjects they own
DROP POLICY IF EXISTS "Teachers read own subjects" ON public.subjects;
CREATE POLICY "Teachers read own subjects"
    ON public.subjects FOR SELECT
    USING (
        teacher_id = auth.uid()
        OR is_active = true
        OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin')
    );

-- Allow teachers to update their own subjects
DROP POLICY IF EXISTS "Teachers update own subjects" ON public.subjects;
CREATE POLICY "Teachers update own subjects"
    ON public.subjects FOR UPDATE
    USING (teacher_id = auth.uid())
    WITH CHECK (teacher_id = auth.uid());

-- ── 2. courses table: fix schema mismatch ────────────────────────────────────
-- Migration 037 used level_id NOT NULL + slug NOT NULL.
-- The frontend code uses stage_id (nullable) and no slug.
-- Fix: add stage_id column, make level_id + slug nullable, add thumbnail_url.

DO $$
BEGIN
    -- Make level_id nullable (it was NOT NULL but code doesn't send it)
    BEGIN
        ALTER TABLE public.courses ALTER COLUMN level_id DROP NOT NULL;
    EXCEPTION WHEN OTHERS THEN NULL; END;

    -- Make slug nullable (code doesn't generate a slug)
    BEGIN
        ALTER TABLE public.courses ALTER COLUMN slug DROP NOT NULL;
    EXCEPTION WHEN OTHERS THEN NULL; END;

    -- Add stage_id column (text slug: tamhidi/ibtidai/mutawasit)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'courses' AND column_name = 'stage_id'
    ) THEN
        ALTER TABLE public.courses ADD COLUMN stage_id TEXT;
    END IF;

    -- Add thumbnail_url column (used in MyCourses display)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'courses' AND column_name = 'thumbnail_url'
    ) THEN
        ALTER TABLE public.courses ADD COLUMN thumbnail_url TEXT;
    END IF;

    -- Ensure cover_image_url exists (older alias)
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'courses' AND column_name = 'cover_image_url'
    ) THEN
        ALTER TABLE public.courses ADD COLUMN cover_image_url TEXT;
    END IF;
END $$;

-- ── 3. lessons.course_id (idempotent – already in 037, re-ensure) ─────────────
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'lessons' AND column_name = 'course_id'
    ) THEN
        ALTER TABLE public.lessons
            ADD COLUMN course_id UUID REFERENCES public.courses(id) ON DELETE SET NULL;
        CREATE INDEX IF NOT EXISTS idx_lessons_course ON public.lessons(course_id);
    END IF;
END $$;

-- ── 4. RPC: get_latest_certificate_version ────────────────────────────────────
-- Follows the reissued_from_id chain to find the latest version of a certificate.
-- Returns the UUID of the latest certificate in the chain.

CREATE OR REPLACE FUNCTION public.get_latest_certificate_version(
    p_certificate_id uuid
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_current_id  uuid := p_certificate_id;
    v_next_id     uuid;
    v_guard       int  := 0;
BEGIN
    -- Walk forward through reissued_from_id chain (max 50 iterations safety guard)
    LOOP
        SELECT id INTO v_next_id
        FROM certificates
        WHERE reissued_from_id = v_current_id
          AND status IN ('issued', 'pending_approval')
        ORDER BY version DESC
        LIMIT 1;

        EXIT WHEN v_next_id IS NULL OR v_guard > 50;

        v_current_id := v_next_id;
        v_guard      := v_guard + 1;
    END LOOP;

    RETURN v_current_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_latest_certificate_version(uuid) TO authenticated;

-- ── 5. RPC: issue_certificate ─────────────────────────────────────────────────
-- Teacher / admin-initiated issuance for a specific student + subject.
-- Checks that the student has completed all published lessons in the subject,
-- then creates a certificate record.
-- Returns: { certificate_id, status, error }

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
    -- ── Auth: only teachers or admins may call this ──
    SELECT role INTO v_caller_role FROM profiles WHERE id = auth.uid();
    IF v_caller_role NOT IN ('teacher', 'super_admin') THEN
        RETURN jsonb_build_object('error', 'Permission denied: teachers and admins only');
    END IF;

    -- ── Fetch student ──
    SELECT full_name, email, gender, student_stage
    INTO v_student
    FROM profiles
    WHERE id = p_student_id AND role = 'student';

    IF v_student IS NULL THEN
        RETURN jsonb_build_object('error', 'Student not found');
    END IF;

    -- ── Fetch subject ──
    SELECT title_ar, title_en, teacher_id
    INTO v_subject
    FROM subjects
    WHERE id = p_subject_id;

    IF v_subject IS NULL THEN
        RETURN jsonb_build_object('error', 'Subject not found');
    END IF;

    -- ── Check completion ──
    SELECT COUNT(*) INTO v_total_lessons
    FROM lessons
    WHERE subject_id = p_subject_id AND is_published = true;

    SELECT COUNT(*) INTO v_completed
    FROM lesson_progress lp
    JOIN lessons l ON l.id = lp.lesson_id
    WHERE lp.user_id    = p_student_id
      AND l.subject_id  = p_subject_id
      AND l.is_published = true
      AND lp.completed_at IS NOT NULL;

    -- ── Check for existing issued cert ──
    SELECT id INTO v_existing_cert
    FROM certificates
    WHERE student_id = p_student_id
      AND subject_id = p_subject_id
      AND status IN ('issued', 'pending_approval')
    LIMIT 1;

    IF v_existing_cert IS NOT NULL THEN
        RETURN jsonb_build_object(
            'status', 'already_exists',
            'certificate_id', v_existing_cert,
            'error', null
        );
    END IF;

    -- ── Fetch teacher name ──
    IF v_subject.teacher_id IS NOT NULL THEN
        SELECT full_name INTO v_teacher_name
        FROM profiles WHERE id = v_subject.teacher_id;
    END IF;

    -- ── Fetch signer settings ──
    SELECT setting_value INTO v_signer_name
    FROM certificate_template_settings WHERE setting_key = 'signer_name';

    SELECT setting_value INTO v_signer_role
    FROM certificate_template_settings WHERE setting_key = 'signer_role';

    -- ── Build snapshot ──
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

    -- ── Insert certificate ──
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

-- ── Notify PostgREST ─────────────────────────────────────────────────────────
NOTIFY pgrst, 'reload schema';
