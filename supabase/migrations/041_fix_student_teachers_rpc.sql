-- Migration: 041_fix_student_teachers_rpc.sql
-- Fix argument name to student_uuid and include progress-based teacher linking

CREATE OR REPLACE FUNCTION public.get_student_teachers(student_uuid UUID)
RETURNS TABLE(teacher_id UUID) AS $$
BEGIN
  RETURN QUERY
  SELECT DISTINCT t_id FROM (
    -- 1. Teachers viaSubscriptions/Grants (Current logic)
    SELECT DISTINCT c.teacher_id as t_id
    FROM public.courses c
    WHERE c.is_published = true
      AND (
        EXISTS (
          SELECT 1 FROM public.subscriptions s
          JOIN public.plans p ON s.plan_id = p.id
          WHERE s.user_id = student_uuid
            AND s.status = 'active'
            AND (s.ends_at IS NULL OR s.ends_at > NOW())
            AND (
              p.scope = 'all'
              OR (p.scope = 'level' AND p.level_id = c.level_id)
              OR (p.scope = 'subject' AND p.subject_id = c.subject_id)
              OR (p.scope = 'course' AND p.course_id = c.id)
            )
        )
        OR EXISTS (
          SELECT 1 FROM public.access_grants g
          WHERE g.user_id = student_uuid
            AND (g.ends_at IS NULL OR g.ends_at > NOW())
            AND (g.course_id = c.id OR g.subject_id = c.subject_id OR g.level_id = c.level_id)
        )
      )
    
    UNION
    
    -- 2. Teachers via Lesson Progress (New logic: started ANY lesson by this teacher)
    SELECT DISTINCT l.created_by as t_id
    FROM public.lesson_progress lp
    JOIN public.lessons l ON lp.lesson_id = l.id
    WHERE lp.user_id = student_uuid
      AND lp.progress_percent >= 1
      AND l.created_by IS NOT NULL
  ) combined;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
