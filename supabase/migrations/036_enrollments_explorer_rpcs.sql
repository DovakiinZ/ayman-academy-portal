-- ============================================
-- ENROLLMENTS EXPLORER RPCS
-- Migration: 036_enrollments_explorer_rpcs.sql
-- ============================================

-- Helper to calculate student progress in a subject
CREATE OR REPLACE FUNCTION get_student_subject_progress(p_student_id UUID, p_subject_id UUID)
RETURNS INT AS $$
DECLARE
    v_total INT;
    v_completed INT;
BEGIN
    SELECT count(*) INTO v_total FROM lessons WHERE subject_id = p_subject_id AND is_published = true;
    IF v_total = 0 THEN RETURN 0; END IF;
    
    SELECT count(*) INTO v_completed 
    FROM lesson_progress lp
    JOIN lessons l ON lp.lesson_id = l.id
    WHERE lp.user_id = p_student_id 
      AND l.subject_id = p_subject_id
      AND lp.completed_at IS NOT NULL;
      
    RETURN round((v_completed::float / v_total::float) * 100);
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- Main RPC for aggregated views
CREATE OR REPLACE FUNCTION get_admin_enrollments(
  p_view TEXT,              -- 'teacher', 'subject', 'course', 'student'
  p_search TEXT DEFAULT '',
  p_stage_id UUID DEFAULT NULL,
  p_status TEXT DEFAULT 'all',
  p_page INT DEFAULT 1,
  p_limit INT DEFAULT 20
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_offset INT := (p_page - 1) * p_limit;
  v_result JSONB;
  v_total_count INT;
BEGIN
  IF p_view = 'teacher' THEN
    SELECT jsonb_build_object(
        'data', COALESCE(jsonb_agg(t), '[]'::jsonb),
        'total', (SELECT count(*) FROM profiles WHERE role = 'teacher' AND (p_search = '' OR full_name ILIKE '%' || p_search || '%' OR email ILIKE '%' || p_search || '%'))
    ) INTO v_result
    FROM (
        SELECT 
            p.id,
            p.full_name,
            p.email,
            (
                SELECT count(DISTINCT lp.user_id)
                FROM lessons l
                JOIN lesson_progress lp ON lp.lesson_id = l.id
                WHERE l.created_by = p.id
            ) as student_count,
            (
                SELECT count(*) FROM lessons l
                WHERE l.created_by = p.id
            ) as lesson_count
        FROM profiles p
        WHERE p.role = 'teacher'
          AND (p_search = '' OR p.full_name ILIKE '%' || p_search || '%' OR p.email ILIKE '%' || p_search || '%')
        ORDER BY student_count DESC
        LIMIT p_limit OFFSET v_offset
    ) t;

  ELSIF p_view = 'subject' THEN
    SELECT jsonb_build_object(
        'data', COALESCE(jsonb_agg(s), '[]'::jsonb),
        'total', (SELECT count(*) FROM subjects s WHERE (p_stage_id IS NULL OR s.stage_id = p_stage_id) AND (p_search = '' OR s.title_ar ILIKE '%' || p_search || '%' OR s.title_en ILIKE '%' || p_search || '%'))
    ) INTO v_result
    FROM (
        SELECT 
            s.id,
            s.title_ar,
            s.title_en,
            st.title_ar as stage_title,
            (
                SELECT count(DISTINCT lp.user_id)
                FROM lessons l
                JOIN lesson_progress lp ON lp.lesson_id = l.id
                WHERE l.subject_id = s.id
            ) as student_count,
            (
                SELECT COALESCE(avg(val), 0)
                FROM (
                    SELECT get_student_subject_progress(lp.user_id, s.id) as val
                    FROM (SELECT DISTINCT user_id FROM lesson_progress lp2 JOIN lessons l2 ON lp2.lesson_id = l2.id WHERE l2.subject_id = s.id) lp
                ) sub
            ) as avg_progress
        FROM subjects s
        JOIN stages st ON s.stage_id = st.id
        WHERE (p_stage_id IS NULL OR s.stage_id = p_stage_id)
          AND (p_search = '' OR s.title_ar ILIKE '%' || p_search || '%' OR s.title_en ILIKE '%' || p_search || '%')
        ORDER BY student_count DESC
        LIMIT p_limit OFFSET v_offset
    ) s;

  ELSIF p_view = 'course' THEN
    SELECT jsonb_build_object(
        'data', COALESCE(jsonb_agg(c), '[]'::jsonb),
        'total', (SELECT count(*) FROM courses c WHERE (p_stage_id IS NULL OR c.level_id = p_stage_id) AND (p_search = '' OR c.title_ar ILIKE '%' || p_search || '%' OR c.title_en ILIKE '%' || p_search || '%'))
    ) INTO v_result
    FROM (
        SELECT 
            c.id,
            c.title_ar,
            c.title_en,
            (
                SELECT count(DISTINCT user_id)
                FROM access_grants
                WHERE course_id = c.id
            ) as student_count,
            c.subject_id
        FROM courses c
        WHERE (p_stage_id IS NULL OR c.level_id = p_stage_id)
          AND (p_search = '' OR c.title_ar ILIKE '%' || p_search || '%' OR c.title_en ILIKE '%' || p_search || '%')
        ORDER BY student_count DESC
        LIMIT p_limit OFFSET v_offset
    ) c;

  ELSIF p_view = 'student' THEN
    SELECT jsonb_build_object(
        'data', COALESCE(jsonb_agg(s), '[]'::jsonb),
        'total', (SELECT count(*) FROM profiles p WHERE p.role = 'student' AND (p_search = '' OR p.full_name ILIKE '%' || p_search || '%' OR p.email ILIKE '%' || p_search || '%'))
    ) INTO v_result
    FROM (
        SELECT 
            p.id,
            p.full_name,
            p.email,
            p.created_at,
            (SELECT count(DISTINCT l.subject_id) FROM lesson_progress lp JOIN lessons l ON lp.lesson_id = l.id WHERE lp.user_id = p.id) as subject_count,
            (SELECT max(updated_at) FROM lesson_progress WHERE user_id = p.id) as last_activity
        FROM profiles p
        WHERE p.role = 'student'
          AND (p_search = '' OR p.full_name ILIKE '%' || p_search || '%' OR p.email ILIKE '%' || p_search || '%')
        ORDER BY last_activity DESC NULLS LAST
        LIMIT p_limit OFFSET v_offset
    ) s;
  END IF;

  RETURN COALESCE(v_result, '{"data": [], "total": 0}'::jsonb);
END;
$$;

-- Detail RPC for drilldowns
CREATE OR REPLACE FUNCTION get_admin_enrollment_detail(
  p_view TEXT,
  p_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_result JSONB;
BEGIN
  IF p_view = 'subject' THEN
    SELECT jsonb_agg(d) INTO v_result
    FROM (
        SELECT 
            p.id,
            p.full_name,
            p.email,
            get_student_subject_progress(p.id, p_id) as progress_percent,
            (SELECT max(lp.updated_at) FROM lesson_progress lp JOIN lessons l ON lp.lesson_id = l.id WHERE lp.user_id = p.id AND l.subject_id = p_id) as last_activity
        FROM (
            SELECT DISTINCT user_id FROM lesson_progress lp2 JOIN lessons l2 ON lp2.lesson_id = l2.id WHERE l2.subject_id = p_id
        ) enrolls
        JOIN profiles p ON enrolls.user_id = p.id
        ORDER BY progress_percent DESC
    ) d;
  ELSIF p_view = 'course' THEN
    SELECT jsonb_agg(d) INTO v_result
    FROM (
        SELECT 
            p.id,
            p.full_name,
            p.email,
            (SELECT count(*) FROM lesson_progress lp JOIN lessons l ON lp.lesson_id = l.id WHERE lp.user_id = p.id AND l.subject_id = (SELECT subject_id FROM courses WHERE id = p_id) AND lp.completed_at IS NOT NULL) as completed_lessons,
            (SELECT count(*) FROM lessons WHERE subject_id = (SELECT subject_id FROM courses WHERE id = p_id)) as total_lessons
        FROM access_grants g
        JOIN profiles p ON g.user_id = p.id
        WHERE g.course_id = p_id
    ) d;
  ELSIF p_view = 'teacher' THEN
    SELECT jsonb_agg(d) INTO v_result
    FROM (
        SELECT 
            p.id,
            p.full_name,
            p.email,
            (SELECT count(DISTINCT l.subject_id) FROM lesson_progress lp JOIN lessons l ON lp.lesson_id = l.id WHERE lp.user_id = p.id AND l.created_by = p_id) as subjects_count
        FROM (
            SELECT DISTINCT lp.user_id
            FROM lessons l
            JOIN lesson_progress lp ON lp.lesson_id = l.id
            WHERE l.created_by = p_id
        ) enrolls
        JOIN profiles p ON enrolls.user_id = p.id
    ) d;
  ELSIF p_view = 'student' THEN
    SELECT jsonb_agg(d) INTO v_result
    FROM (
        SELECT 
            s.id,
            s.title_ar,
            st.title_ar as stage_title,
            get_student_subject_progress(p_id, s.id) as progress_percent
        FROM (
            SELECT DISTINCT l.subject_id
            FROM lesson_progress lp
            JOIN lessons l ON lp.lesson_id = l.id
            WHERE lp.user_id = p_id
        ) enrolled
        JOIN subjects s ON enrolled.subject_id = s.id
        JOIN stages st ON s.stage_id = st.id
    ) d;
  END IF;

  RETURN COALESCE(v_result, '[]'::jsonb);
END;
$$;
