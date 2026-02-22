// ============================================
// AI STUDENT COACH SERVICE
// ============================================

import { supabase } from '@/lib/supabase';
import type { StudentCoachReport } from '@/types/database';

// ============================================
// MOTIVATIONAL MESSAGES
// ============================================

const MOTIVATIONAL_MESSAGES = {
    excellent: [
        'أداؤك ممتاز! استمر في التفوق 🌟',
        'أنت من أفضل الطلاب — واصل التميز! 🏆',
        'عمل رائع! أنت على الطريق الصحيح 💪',
    ],
    good: [
        'أداء جيد! مع القليل من الجهد ستصل للقمة 📈',
        'أنت تتقدم بشكل رائع — لا تتوقف! 🚀',
        'جهد مميز! ركّز على نقاط الضعف لتحسين أدائك 💡',
    ],
    average: [
        'يمكنك تحقيق المزيد! ركّز على المراجعة اليومية 📚',
        'لا تستسلم — كل خطوة تقربك من هدفك 🎯',
        'حاول تخصيص وقت إضافي للمواد الصعبة 🔑',
    ],
    struggling: [
        'لا تقلق — كل بداية صعبة. ابدأ بالأساسيات 🌱',
        'اطلب المساعدة من معلمك — أنت لست وحدك 🤝',
        'خطوة بخطوة ستصل — المهم أن تستمر! 💪',
    ],
};

function getRandomMessage(category: keyof typeof MOTIVATIONAL_MESSAGES): string {
    const messages = MOTIVATIONAL_MESSAGES[category];
    return messages[Math.floor(Math.random() * messages.length)];
}

// ============================================
// MAIN ANALYSIS FUNCTION
// ============================================

export async function analyzeStudentPerformance(studentId: string): Promise<StudentCoachReport> {
    // Fetch all student data in parallel
    const [progressRes, quizRes, lessonsRes] = await Promise.all([
        (supabase.from('lesson_progress') as any)
            .select('lesson_id, progress_percent, updated_at, lessons!inner(id, title_ar, subject_id, subjects!inner(id, title_ar))')
            .eq('user_id', studentId),
        (supabase.from('quiz_attempts') as any)
            .select('quiz_id, score_percent, passed, created_at, quizzes!inner(lesson_id, title, lessons!inner(subject_id, subjects!inner(id, title_ar)))')
            .eq('student_id', studentId)
            .order('created_at', { ascending: false }),
        (supabase.from('lessons') as any)
            .select('id, title_ar, subject_id, subjects!inner(id, title_ar)')
            .order('sort_order'),
    ]);

    const progress = progressRes.data || [];
    const quizAttempts = quizRes.data || [];
    const allLessons = lessonsRes.data || [];

    // ============================
    // 1. Per-Subject Analysis
    // ============================
    const subjectScores: Record<string, { name: string; scores: number[]; completed: number; total: number }> = {};

    // Track completed lessons per subject
    for (const p of progress) {
        const subjectId = p.lessons?.subject_id;
        const subjectName = p.lessons?.subjects?.title_ar || 'مادة';

        if (!subjectId) continue;

        if (!subjectScores[subjectId]) {
            subjectScores[subjectId] = { name: subjectName, scores: [], completed: 0, total: 0 };
        }

        if (p.progress_percent === 100) {
            subjectScores[subjectId].completed++;
        }
    }

    // Track total lessons per subject
    for (const l of allLessons) {
        const subjectId = l.subject_id;
        if (subjectScores[subjectId]) {
            subjectScores[subjectId].total++;
        }
    }

    // Add quiz scores per subject
    for (const q of quizAttempts) {
        const subjectId = q.quizzes?.lessons?.subject_id;
        if (subjectId && subjectScores[subjectId]) {
            subjectScores[subjectId].scores.push(q.score_percent);
        }
    }

    // ============================
    // 2. Identify Strengths & Weaknesses
    // ============================
    const strengths: string[] = [];
    const weaknesses: string[] = [];

    for (const [, data] of Object.entries(subjectScores)) {
        const avgScore = data.scores.length > 0
            ? data.scores.reduce((a, b) => a + b, 0) / data.scores.length
            : null;

        if (avgScore !== null) {
            if (avgScore >= 80) {
                strengths.push(data.name);
            } else if (avgScore < 60) {
                weaknesses.push(data.name);
            }
        }

        // Low completion
        if (data.total > 0 && data.completed / data.total < 0.3) {
            if (!weaknesses.includes(data.name)) {
                weaknesses.push(data.name);
            }
        }
    }

    // ============================
    // 3. Risk Score
    // ============================
    let riskScore = 0;

    // Factor 1: Recent activity drop
    const recentQuizzes = quizAttempts.filter((q: any) => {
        const d = new Date(q.created_at);
        const now = new Date();
        return (now.getTime() - d.getTime()) < 14 * 24 * 60 * 60 * 1000; // last 2 weeks
    });

    const olderQuizzes = quizAttempts.filter((q: any) => {
        const d = new Date(q.created_at);
        const now = new Date();
        const diff = now.getTime() - d.getTime();
        return diff >= 14 * 24 * 60 * 60 * 1000 && diff < 28 * 24 * 60 * 60 * 1000;
    });

    if (olderQuizzes.length > 0 && recentQuizzes.length < olderQuizzes.length * 0.5) {
        riskScore += 30; // Activity drop
    }

    // Factor 2: Low scores
    const allScores = quizAttempts.map((q: any) => q.score_percent as number);
    const overallAvg = allScores.length > 0
        ? allScores.reduce((a: number, b: number) => a + b, 0) / allScores.length
        : 50;

    if (overallAvg < 50) riskScore += 30;
    else if (overallAvg < 65) riskScore += 15;

    // Factor 3: Low completion rate
    const totalCompleted = Object.values(subjectScores).reduce((sum, s) => sum + s.completed, 0);
    const totalLessons = Object.values(subjectScores).reduce((sum, s) => sum + s.total, 0);
    const completionRate = totalLessons > 0 ? totalCompleted / totalLessons : 0;

    if (completionRate < 0.3) riskScore += 25;
    else if (completionRate < 0.5) riskScore += 10;

    // Factor 4: No recent activity at all
    if (quizAttempts.length === 0 && progress.length === 0) {
        riskScore = 80;
    } else if (recentQuizzes.length === 0 && progress.length > 0) {
        riskScore += 15;
    }

    riskScore = Math.min(100, riskScore);

    // ============================
    // 4. Suggested Lessons
    // ============================
    const completedLessonIds = new Set(
        progress.filter((p: any) => p.progress_percent === 100).map((p: any) => p.lesson_id)
    );

    const suggestedLessons = allLessons
        .filter((l: any) => !completedLessonIds.has(l.id))
        .slice(0, 5)
        .map((l: any) => ({ id: l.id, title: l.title_ar }));

    // ============================
    // 5. Motivational Message
    // ============================
    let messageCategory: keyof typeof MOTIVATIONAL_MESSAGES;
    if (riskScore >= 60) messageCategory = 'struggling';
    else if (riskScore >= 35) messageCategory = 'average';
    else if (overallAvg >= 80) messageCategory = 'excellent';
    else messageCategory = 'good';

    return {
        riskScore,
        strengths,
        weaknesses,
        suggestedLessons,
        motivationalMessage: getRandomMessage(messageCategory),
    };
}
