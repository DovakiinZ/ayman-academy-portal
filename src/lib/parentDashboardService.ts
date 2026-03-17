// ============================================
// PARENT DASHBOARD SERVICE
// ============================================

import { supabase } from '@/lib/supabase';
import type { ParentStudentReport, ParentLink } from '@/types/database';

// ============================================
// PARENT LINK OPERATIONS
// ============================================

export async function getLinkedStudents(parentId: string): Promise<ParentLink[]> {
    const { data } = await (supabase
        .from('parent_links') as any)
        .select('*, student:profiles!parent_links_student_id_fkey(id, full_name, email, avatar_url)')
        .eq('parent_id', parentId);

    return (data || []) as ParentLink[];
}

export async function linkStudent(parentId: string, studentEmail: string): Promise<{ success: boolean; error?: string }> {
    // Find student by email
    const { data: student, error: findError } = await (supabase
        .from('profiles') as any)
        .select('id, role')
        .eq('email', studentEmail)
        .eq('role', 'student')
        .single();

    if (findError || !student) {
        return { success: false, error: 'لم يتم العثور على طالب بهذا البريد' };
    }

    // Check existing link
    const { data: existing } = await (supabase
        .from('parent_links') as any)
        .select('id')
        .eq('parent_id', parentId)
        .eq('student_id', student.id)
        .single();

    if (existing) {
        return { success: false, error: 'هذا الطالب مرتبط مسبقاً بحسابك' };
    }

    const { error: insertError } = await (supabase
        .from('parent_links') as any)
        .insert({ parent_id: parentId, student_id: student.id });

    if (insertError) {
        return { success: false, error: 'فشل الربط — حاول مرة أخرى' };
    }

    return { success: true };
}

// ============================================
// STUDENT REPORT
// ============================================

export async function getStudentReport(parentId: string, studentId: string): Promise<ParentStudentReport | null> {
    // Verify parent has access to this student
    const { data: link } = await (supabase
        .from('parent_links') as any)
        .select('id')
        .eq('parent_id', parentId)
        .eq('student_id', studentId)
        .single();

    if (!link) return null;

    const now = new Date();
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();

    // Fetch data in parallel
    const [progressRes, quizRes, allStudentsQuizRes] = await Promise.all([
        // Student's lesson progress
        (supabase.from('lesson_progress') as any)
            .select('lesson_id, progress_percent, updated_at, lessons!inner(subject_id, subjects!inner(title_ar))')
            .eq('user_id', studentId),
        // Student's quiz attempts
        (supabase.from('quiz_attempts') as any)
            .select('score_percent, passed, created_at, quizzes!inner(lesson_id, lessons!inner(subject_id, subjects!inner(title_ar)))')
            .eq('student_id', studentId),
        // All students' quiz averages (for comparison)
        (supabase.from('quiz_attempts') as any)
            .select('student_id, score_percent'),
    ]);

    const progress = progressRes.data || [];
    const quizAttempts = quizRes.data || [];
    const allQuizzes = allStudentsQuizRes.data || [];

    // ============================
    // 1. Progress Percent
    // ============================
    const totalProgress = progress.reduce((sum: number, p: any) => sum + (p.progress_percent || 0), 0);
    const progressPercent = progress.length > 0 ? Math.round(totalProgress / progress.length) : 0;

    // ============================
    // 2. Weekly Lessons Completed
    // ============================
    const weeklyLessonsCompleted = progress.filter((p: any) =>
        p.progress_percent === 100 && p.updated_at >= oneWeekAgo
    ).length;

    // ============================
    // 3. Average Score
    // ============================
    const scores = quizAttempts.map((q: any) => q.score_percent as number);
    const avgScore = scores.length > 0 ? Math.round(scores.reduce((a: number, b: number) => a + b, 0) / scores.length) : 0;

    // ============================
    // 4. Time Spent (estimated from progress records)
    // ============================
    const recentProgress = progress.filter((p: any) => p.updated_at >= oneWeekAgo);
    const timeSpentMinutes = recentProgress.length * 15; // rough estimate

    // ============================
    // 5. Strengths & Weaknesses
    // ============================
    const subjectScores: Record<string, { name: string; scores: number[] }> = {};

    for (const q of quizAttempts) {
        const subjectName = q.quizzes?.lessons?.subjects?.title_ar;
        const subjectId = q.quizzes?.lessons?.subject_id;
        if (subjectId && subjectName) {
            if (!subjectScores[subjectId]) subjectScores[subjectId] = { name: subjectName, scores: [] };
            subjectScores[subjectId].scores.push(q.score_percent);
        }
    }

    const strengths: string[] = [];
    const weaknesses: string[] = [];

    for (const [, data] of Object.entries(subjectScores)) {
        const avg = data.scores.reduce((a, b) => a + b, 0) / data.scores.length;
        if (avg >= 80) strengths.push(data.name);
        else if (avg < 60) weaknesses.push(data.name);
    }

    // ============================
    // 6. Comparison to Class Average
    // ============================
    const allScores = allQuizzes.map((q: any) => q.score_percent as number);
    const classAvg = allScores.length > 0 ? allScores.reduce((a: number, b: number) => a + b, 0) / allScores.length : 0;
    const comparisonToClassAverage = Math.round(avgScore - classAvg);

    return {
        progressPercent,
        weeklyLessonsCompleted,
        avgScore,
        timeSpentMinutes,
        strengths,
        weaknesses,
        comparisonToClassAverage,
    };
}
