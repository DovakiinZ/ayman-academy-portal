// ============================================
// GAMIFICATION SERVICE
// ============================================

import { supabase } from '@/lib/supabase';
import type { StudentXP, StudentLevel, Badge, StudentBadge, StudentLevelName, XPEventType } from '@/types/database';

// ============================================
// LEVEL THRESHOLDS
// ============================================

const LEVEL_THRESHOLDS: { level: StudentLevelName; minXP: number }[] = [
    { level: 'expert', minXP: 5000 },
    { level: 'scholar', minXP: 2000 },
    { level: 'learner', minXP: 500 },
    { level: 'beginner', minXP: 0 },
];

const XP_REWARDS: Record<XPEventType, number> = {
    lesson_complete: 50,
    quiz_pass: 100,
    streak_day: 25,
    assignment_submit: 75,
    certificate_earned: 200,
    badge_earned: 50,
};

export function getLevelFromXP(totalXP: number): StudentLevelName {
    for (const { level, minXP } of LEVEL_THRESHOLDS) {
        if (totalXP >= minXP) return level;
    }
    return 'beginner';
}

export function getNextLevelInfo(totalXP: number): { nextLevel: StudentLevelName | null; xpNeeded: number; progress: number } {
    const currentLevel = getLevelFromXP(totalXP);
    const currentIdx = LEVEL_THRESHOLDS.findIndex(t => t.level === currentLevel);

    if (currentIdx === 0) {
        return { nextLevel: null, xpNeeded: 0, progress: 100 };
    }

    const nextLevelThreshold = LEVEL_THRESHOLDS[currentIdx - 1];
    const currentThreshold = LEVEL_THRESHOLDS[currentIdx];
    const range = nextLevelThreshold.minXP - currentThreshold.minXP;
    const progress = Math.min(100, Math.round(((totalXP - currentThreshold.minXP) / range) * 100));

    return {
        nextLevel: nextLevelThreshold.level,
        xpNeeded: nextLevelThreshold.minXP - totalXP,
        progress,
    };
}

export function getLevelLabel(level: StudentLevelName, lang: 'ar' | 'en' = 'ar'): string {
    const labels: Record<StudentLevelName, { ar: string; en: string }> = {
        beginner: { ar: 'مبتدئ', en: 'Beginner' },
        learner: { ar: 'متعلم', en: 'Learner' },
        scholar: { ar: 'دارس', en: 'Scholar' },
        expert: { ar: 'خبير', en: 'Expert' },
    };
    return labels[level]?.[lang] ?? level;
}

export function getLevelIcon(level: StudentLevelName): string {
    const icons: Record<StudentLevelName, string> = {
        beginner: '🌱',
        learner: '📖',
        scholar: '🎓',
        expert: '👑',
    };
    return icons[level] ?? '🌱';
}

// ============================================
// XP OPERATIONS
// ============================================

export async function awardXP(
    studentId: string,
    eventType: XPEventType,
    sourceId?: string,
    customPoints?: number
): Promise<{ xp: StudentXP | null; levelUp: boolean; newLevel: StudentLevelName | null }> {
    const points = customPoints ?? XP_REWARDS[eventType] ?? 0;
    if (points <= 0) return { xp: null, levelUp: false, newLevel: null };

    // 1. Insert XP record
    const { data: xpRecord, error: xpError } = await (supabase
        .from('student_xp') as any)
        .insert({
            student_id: studentId,
            event_type: eventType,
            points,
            source_id: sourceId || null,
        })
        .select()
        .single();

    if (xpError) {
        console.error('Failed to award XP:', xpError);
        return { xp: null, levelUp: false, newLevel: null };
    }

    // 2. Upsert student_levels
    const { data: existingLevel } = await (supabase
        .from('student_levels') as any)
        .select('*')
        .eq('student_id', studentId)
        .single();

    const currentTotalXP = (existingLevel?.total_xp || 0) + points;
    const newLevel = getLevelFromXP(currentTotalXP);
    const oldLevel = existingLevel?.current_level || 'beginner';
    const levelUp = newLevel !== oldLevel;

    // Calculate streak
    const today = new Date().toISOString().split('T')[0];
    const lastActivity = existingLevel?.last_activity_date;
    let streakDays = existingLevel?.streak_days || 0;

    if (lastActivity) {
        const lastDate = new Date(lastActivity);
        const todayDate = new Date(today);
        const diffDays = Math.floor((todayDate.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24));

        if (diffDays === 1) {
            streakDays += 1;
        } else if (diffDays > 1) {
            streakDays = 1;
        }
        // same day: no change
    } else {
        streakDays = 1;
    }

    if (existingLevel) {
        await (supabase.from('student_levels') as any)
            .update({
                total_xp: currentTotalXP,
                current_level: newLevel,
                streak_days: streakDays,
                last_activity_date: today,
                updated_at: new Date().toISOString(),
            })
            .eq('student_id', studentId);
    } else {
        await (supabase.from('student_levels') as any)
            .insert({
                student_id: studentId,
                total_xp: currentTotalXP,
                current_level: newLevel,
                streak_days: streakDays,
                last_activity_date: today,
            });
    }

    return { xp: xpRecord as StudentXP, levelUp, newLevel: levelUp ? newLevel : null };
}

// ============================================
// LEVEL & XP QUERIES
// ============================================

export async function getStudentLevel(studentId: string): Promise<StudentLevel | null> {
    const { data, error } = await (supabase
        .from('student_levels') as any)
        .select('*')
        .eq('student_id', studentId)
        .single();

    if (error || !data) return null;
    return data as StudentLevel;
}

export async function getStudentXPHistory(studentId: string, limit = 20): Promise<StudentXP[]> {
    const { data } = await (supabase
        .from('student_xp') as any)
        .select('*')
        .eq('student_id', studentId)
        .order('created_at', { ascending: false })
        .limit(limit);

    return (data || []) as StudentXP[];
}

// ============================================
// BADGE OPERATIONS
// ============================================

export async function getAllBadges(): Promise<Badge[]> {
    const { data } = await (supabase
        .from('badges') as any)
        .select('*')
        .order('sort_order');

    return (data || []) as Badge[];
}

export async function getStudentBadges(studentId: string): Promise<StudentBadge[]> {
    const { data } = await (supabase
        .from('student_badges') as any)
        .select('*, badge:badges(*)')
        .eq('student_id', studentId)
        .order('earned_at', { ascending: false });

    return (data || []) as StudentBadge[];
}

export async function checkAndAwardBadges(studentId: string): Promise<StudentBadge[]> {
    const [level, allBadges, existingBadges] = await Promise.all([
        getStudentLevel(studentId),
        getAllBadges(),
        getStudentBadges(studentId),
    ]);

    if (!level) return [];

    const earnedBadgeIds = new Set(existingBadges.map(b => b.badge_id));
    const newBadges: StudentBadge[] = [];

    for (const badge of allBadges) {
        if (earnedBadgeIds.has(badge.id)) continue;

        let earned = false;

        switch (badge.criteria_type) {
            case 'streak':
                earned = level.streak_days >= badge.criteria_value;
                break;
            case 'xp_total':
                earned = level.total_xp >= badge.criteria_value;
                break;
            case 'score': {
                // Check if student has any quiz with score >= criteria_value
                const { data: quizzes } = await (supabase
                    .from('quiz_attempts') as any)
                    .select('score_percent')
                    .eq('student_id', studentId)
                    .gte('score_percent', badge.criteria_value)
                    .limit(1);
                earned = (quizzes?.length || 0) > 0;
                break;
            }
            case 'courses_completed': {
                // Count subjects with 100% progress
                const { data: progress } = await (supabase
                    .from('lesson_progress') as any)
                    .select('lesson_id, progress_percent, lessons!inner(subject_id)')
                    .eq('user_id', studentId)
                    .eq('progress_percent', 100);

                const subjectIds = new Set((progress || []).map((p: any) => p.lessons?.subject_id).filter(Boolean));
                earned = subjectIds.size >= badge.criteria_value;
                break;
            }
        }

        if (earned) {
            const { data: newBadge } = await (supabase
                .from('student_badges') as any)
                .insert({ student_id: studentId, badge_id: badge.id })
                .select('*, badge:badges(*)')
                .single();

            if (newBadge) newBadges.push(newBadge as StudentBadge);
        }
    }

    return newBadges;
}
