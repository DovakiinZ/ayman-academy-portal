/**
 * Centralized React Query hooks for Ayman Academy data.
 *
 * Each hook wraps a Supabase query with per-resource stale policies.
 * Data is served from cache instantly on refresh, with background
 * revalidation only when stale.
 *
 * Query keys are scoped with userId where relevant to prevent
 * cross-user data leaking.
 */

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { STALE_TIMES } from '@/lib/queryConfig';

// ── Stages ──────────────────────────────────

export function useStages() {
    return useQuery({
        queryKey: ['stages'],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('stages')
                .select('*, subjects(id)')
                .eq('is_active', true)
                .order('sort_order', { ascending: true });

            if (error) throw error;
            return (data || []).map((s: any) => ({
                ...s,
                subjects_count: s.subjects?.length || 0,
            }));
        },
        staleTime: STALE_TIMES.STATIC,
    });
}

// ── Subjects ──────────────────────────────────

export function useSubjects(stageId?: string) {
    return useQuery({
        queryKey: ['subjects', stageId ?? 'all'],
        queryFn: async () => {
            let query = supabase
                .from('subjects')
                .select('*, stage:stages(title_ar, title_en), lessons(id)')
                .eq('is_active', true)
                .order('sort_order', { ascending: true });

            if (stageId) {
                query = query.eq('stage_id', stageId);
            }

            const { data, error } = await query;
            if (error) throw error;
            return (data || []).map((s: any) => ({
                ...s,
                lessons_count: s.lessons?.length || 0,
            }));
        },
        staleTime: STALE_TIMES.STATIC,
    });
}

// ── Single Subject Detail ───────────────────

export function useSubjectDetail(subjectId?: string) {
    return useQuery<any>({
        queryKey: ['subject', subjectId],
        queryFn: async () => {
            const { data, error } = await supabase
                .from('subjects')
                .select('*, stage:stages(*)')
                .eq('id', subjectId!)
                .single();

            if (error) throw error;
            return data as any;
        },
        enabled: !!subjectId,
        staleTime: STALE_TIMES.SEMI_STATIC,
    });
}

// ── Lessons for a Subject (with user progress) ──

export function useSubjectLessons(subjectId?: string, userId?: string) {
    return useQuery({
        queryKey: ['subject-lessons', subjectId, userId],
        queryFn: async () => {
            // Fetch lessons
            const { data: lessons, error: lessonsErr } = await supabase
                .from('lessons')
                .select('*')
                .eq('subject_id', subjectId!)
                .eq('is_published', true)
                .order('order_index', { ascending: true });

            if (lessonsErr) throw lessonsErr;
            const lessonsList = lessons || [];

            if (lessonsList.length === 0 || !userId) {
                return { lessons: lessonsList, progress: [] };
            }

            // Fetch progress
            const { data: progressData } = await supabase
                .from('lesson_progress')
                .select('*')
                .eq('user_id', userId)
                .in('lesson_id', lessonsList.map((l: any) => l.id));

            return {
                lessons: lessonsList,
                progress: progressData || [],
            };
        },
        enabled: !!subjectId,
        staleTime: STALE_TIMES.DYNAMIC,
    });
}

// ── Student Dashboard Aggregate ─────────────

export function useStudentDashboard(userId?: string) {
    return useQuery({
        queryKey: ['student-dashboard', userId],
        queryFn: async () => {
            // Recent progress
            const { data: recentProgress } = await supabase
                .from('lesson_progress')
                .select('*, lesson:lessons(*, subject:subjects(*))')
                .eq('user_id', userId!)
                .order('updated_at', { ascending: false })
                .limit(10);

            // Enrolled subjects (has progress)
            const { data: allProgress } = await supabase
                .from('lesson_progress')
                .select('lesson_id, completed_at, lessons!inner(subject_id)')
                .eq('user_id', userId!);

            // Subjects list
            const { data: subjects } = await supabase
                .from('subjects')
                .select('*, stage:stages(title_ar, title_en)')
                .eq('is_published', true)
                .order('order_index', { ascending: true });

            return {
                recentProgress: recentProgress || [],
                allProgress: allProgress || [],
                subjects: subjects || [],
            };
        },
        enabled: !!userId,
        staleTime: STALE_TIMES.DYNAMIC,
    });
}

// ── Teachers for a Student ──────────────────

export function useStudentTeachers(userId?: string) {
    return useQuery({
        queryKey: ['student-teachers', userId],
        queryFn: async () => {
            const { data, error } = await (supabase
                .rpc as any)('get_student_teachers', { student_uuid: userId! });

            if (error) throw error;

            if (!data || data.length === 0) return [];

            const teacherIds = (data as any[]).map((r: any) => r.teacher_id);
            const { data: profiles } = await supabase
                .from('profiles')
                .select('id, full_name, avatar_url, bio_en, bio_ar')
                .in('id', teacherIds);

            return profiles || [];
        },
        enabled: !!userId,
        staleTime: STALE_TIMES.SEMI_STATIC,
    });
}

// ── Lesson Teachers (by subject) ────────────

export function useSubjectTeachers(subjectId?: string) {
    return useQuery({
        queryKey: ['subject-teachers', subjectId],
        queryFn: async () => {
            // Get distinct teacher IDs from lessons in this subject
            const { data: lessons } = await supabase
                .from('lessons')
                .select('created_by')
                .eq('subject_id', subjectId!)
                .eq('is_published', true);

            const teacherIds = Array.from(
                new Set((lessons || []).map((l: any) => l.created_by).filter(Boolean))
            );

            if (teacherIds.length === 0) return [];

            const { data: profiles } = await supabase
                .from('profiles')
                .select('id, full_name, avatar_url, bio_en, bio_ar')
                .in('id', teacherIds);

            return profiles || [];
        },
        enabled: !!subjectId,
        staleTime: STALE_TIMES.SEMI_STATIC,
    });
}

// ── My Subjects (all subjects with progress) ──

export function useMySubjects(userId?: string) {
    return useQuery({
        queryKey: ['my-subjects', userId],
        queryFn: async () => {
            // Fetch all subjects with stage + lesson IDs
            const { data: subjectsData, error } = await supabase
                .from('subjects')
                .select('*, stage:stages(*), lessons(id)')
                .eq('is_active', true)
                .order('sort_order', { ascending: true });

            if (error) throw error;
            if (!subjectsData) return [];

            // Fetch all progress for this user
            const { data: progressData } = await supabase
                .from('lesson_progress')
                .select('lesson_id, completed_at')
                .eq('user_id', userId!);

            const completedIds = new Set(
                ((progressData || []) as any[]).filter(p => p.completed_at).map(p => p.lesson_id)
            );

            return (subjectsData as any[]).map(s => {
                const lessonIds: string[] = (s.lessons || []).map((l: any) => l.id);
                const totalLessons = lessonIds.length;
                const completedLessons = lessonIds.filter(id => completedIds.has(id)).length;
                const progressPercent = totalLessons > 0
                    ? Math.round((completedLessons / totalLessons) * 100)
                    : 0;

                return {
                    ...s,
                    lessons: undefined,
                    total_lessons: totalLessons,
                    completed_lessons: completedLessons,
                    progress_percent: progressPercent,
                };
            });
        },
        enabled: !!userId,
        staleTime: STALE_TIMES.DYNAMIC,
    });
}
