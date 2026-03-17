/**
 * Eligibility Engine
 *
 * Evaluates whether a student meets the certificate rules defined for a subject.
 * Performs recursive AND/OR evaluation of the rule_json tree.
 * Does NOT create certificates — only returns eligibility status.
 */

import { supabase } from './supabase';
import type {
    CertificateRule,
    RuleNode,
    EligibilityResult,
    MissingRequirement,
} from '@/types/database';

// ── Student Context ────────────────────────

interface StudentContext {
    progressPercent: number;      // 0-100
    bestExamScore: number | null; // 0-100, null if no exam taken
    assignmentApproved: boolean;
}

// ── Fetch student data for a subject ───────

async function fetchStudentContext(
    studentId: string,
    subjectId: string
): Promise<StudentContext> {
    // 1. Fetch all lessons for the subject
    const { data: lessons } = await supabase
        .from('lessons')
        .select('id')
        .eq('subject_id', subjectId)
        .eq('is_published', true);

    const lessonIds = (lessons || []).map((l: any) => l.id);
    const totalLessons = lessonIds.length;

    // 2. Compute progress percent
    let progressPercent = 0;
    if (totalLessons > 0 && lessonIds.length > 0) {
        const { data: progressData } = await supabase
            .from('lesson_progress')
            .select('completed_at')
            .eq('user_id', studentId)
            .in('lesson_id', lessonIds);

        const completedCount = (progressData || []).filter(
            (p: any) => p.completed_at !== null
        ).length;
        progressPercent = Math.round((completedCount / totalLessons) * 100);
    }

    // 3. Fetch best exam score (quiz attempts for quizzes attached to this subject's lessons)
    let bestExamScore: number | null = null;
    if (lessonIds.length > 0) {
        // Get lesson-level quizzes
        const { data: quizzes } = await supabase
            .from('quizzes')
            .select('id')
            .in('lesson_id', lessonIds);

        const quizIds = (quizzes || []).map((q: any) => q.id);

        if (quizIds.length > 0) {
            // Check lesson_quiz system (inline quizzes)
            // These don't have a separate attempts table — scores are computed client-side
            // For the eligibility engine, we look at quiz_attempts from the advanced quiz system
        }

        // Also check advanced quiz system (005_quizzes.sql)
        const { data: advancedQuizzes } = await (supabase
            .from('quizzes') as any)
            .select('id')
            .in('lesson_id', lessonIds)
            .eq('is_enabled', true);

        const advQuizIds = (advancedQuizzes || []).map((q: any) => q.id);

        if (advQuizIds.length > 0) {
            const { data: attempts } = await (supabase
                .from('quiz_attempts') as any)
                .select('score_percent')
                .eq('student_id', studentId)
                .in('quiz_id', advQuizIds)
                .order('score_percent', { ascending: false })
                .limit(1);

            if (attempts && attempts.length > 0) {
                bestExamScore = attempts[0].score_percent;
            }
        }
    }

    // 4. Assignment approval — placeholder (no assignment system yet)
    // Always returns false; admins can approve manually via the approval flow
    const assignmentApproved = false;

    return { progressPercent, bestExamScore, assignmentApproved };
}

// ── Rule Evaluation ────────────────────────

function evaluateRule(
    rule: RuleNode,
    ctx: StudentContext,
    missing: MissingRequirement[]
): boolean {
    switch (rule.type) {
        case 'AND': {
            let allPassed = true;
            for (const child of rule.rules) {
                if (!evaluateRule(child, ctx, missing)) {
                    allPassed = false;
                    // Don't break — collect ALL missing requirements
                }
            }
            return allPassed;
        }
        case 'OR': {
            let anyPassed = false;
            const orMissing: MissingRequirement[] = [];
            for (const child of rule.rules) {
                if (evaluateRule(child, ctx, orMissing)) {
                    anyPassed = true;
                }
            }
            if (!anyPassed) {
                // All branches failed — add all missing requirements
                missing.push(...orMissing);
            }
            return anyPassed;
        }
        case 'progress': {
            const passed = ctx.progressPercent >= rule.minPercent;
            if (!passed) {
                missing.push({
                    type: 'progress',
                    current: ctx.progressPercent,
                    required: rule.minPercent,
                });
            }
            return passed;
        }
        case 'final_exam': {
            const score = ctx.bestExamScore ?? 0;
            const passed = score >= rule.minScore;
            if (!passed) {
                missing.push({
                    type: 'final_exam',
                    current: score,
                    required: rule.minScore,
                });
            }
            return passed;
        }
        case 'assignment_approved': {
            if (!rule.required) return true;
            const passed = ctx.assignmentApproved;
            if (!passed) {
                missing.push({
                    type: 'assignment_approved',
                    current: 0,
                    required: 1,
                });
            }
            return passed;
        }
        default:
            return true;
    }
}

// ── Main Entry Point ───────────────────────

export async function evaluateEligibility(
    studentId: string,
    subjectId: string
): Promise<EligibilityResult & { rule?: CertificateRule }> {
    // 1. Fetch certificate rule for this subject
    const { data: ruleData } = await supabase
        .from('certificate_rules')
        .select('*')
        .eq('subject_id', subjectId)
        .eq('enabled', true)
        .single() as any;

    if (!ruleData) {
        // No rule configured or not enabled → not eligible (no certificate available)
        return { eligible: false, missingRequirements: [], rule: undefined };
    }

    const rule = ruleData as CertificateRule;

    // 2. Fetch student context
    const ctx = await fetchStudentContext(studentId, subjectId);

    // 3. Evaluate rules
    const missingRequirements: MissingRequirement[] = [];
    const eligible = evaluateRule(rule.rule_json, ctx, missingRequirements);

    return { eligible, missingRequirements, rule };
}

/**
 * Fetch the certificate rule config for a subject (regardless of enabled status).
 * Used by admin UI.
 */
export async function fetchCertificateRule(
    subjectId: string
): Promise<CertificateRule | null> {
    const { data } = await supabase
        .from('certificate_rules')
        .select('*')
        .eq('subject_id', subjectId)
        .single() as any;

    return data as CertificateRule | null;
}
