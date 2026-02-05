/**
 * Dummy data for admin pages fallback
 * Used when Supabase returns empty/fails
 */

import type { Stage, Subject, Lesson, Profile, TeacherInvite } from '@/types/database';

// ============================================
// STAGES (formerly Levels)
// ============================================
export const dummyStages: Stage[] = [
    {
        id: 'dummy-stage-1',
        slug: 'kindergarten',
        title_ar: 'تمهيدي',
        title_en: 'Kindergarten',
        sort_order: 1,
        is_active: true,
        created_at: new Date().toISOString(),
    },
    {
        id: 'dummy-stage-2',
        slug: 'primary',
        title_ar: 'ابتدائي',
        title_en: 'Primary',
        sort_order: 2,
        is_active: true,
        created_at: new Date().toISOString(),
    },
    {
        id: 'dummy-stage-3',
        slug: 'middle',
        title_ar: 'متوسط',
        title_en: 'Middle School',
        sort_order: 3,
        is_active: true,
        created_at: new Date().toISOString(),
    },
];

// Backward compatibility alias
export const dummyLevels = dummyStages;

// ============================================
// SUBJECTS
// ============================================
export const dummySubjects: Record<string, Subject[]> = {
    'dummy-stage-1': [
        { id: 'dummy-subject-1', stage_id: 'dummy-stage-1', slug: 'arabic', title_ar: 'اللغة العربية', title_en: 'Arabic', description_ar: null, description_en: null, sort_order: 1, is_active: true, created_at: new Date().toISOString() },
        { id: 'dummy-subject-2', stage_id: 'dummy-stage-1', slug: 'math', title_ar: 'الرياضيات', title_en: 'Math', description_ar: null, description_en: null, sort_order: 2, is_active: true, created_at: new Date().toISOString() },
    ],
    'dummy-stage-2': [
        { id: 'dummy-subject-3', stage_id: 'dummy-stage-2', slug: 'arabic', title_ar: 'اللغة العربية', title_en: 'Arabic', description_ar: null, description_en: null, sort_order: 1, is_active: true, created_at: new Date().toISOString() },
        { id: 'dummy-subject-4', stage_id: 'dummy-stage-2', slug: 'math', title_ar: 'الرياضيات', title_en: 'Math', description_ar: null, description_en: null, sort_order: 2, is_active: true, created_at: new Date().toISOString() },
        { id: 'dummy-subject-5', stage_id: 'dummy-stage-2', slug: 'science', title_ar: 'العلوم', title_en: 'Science', description_ar: null, description_en: null, sort_order: 3, is_active: true, created_at: new Date().toISOString() },
        { id: 'dummy-subject-6', stage_id: 'dummy-stage-2', slug: 'english', title_ar: 'اللغة الإنجليزية', title_en: 'English', description_ar: null, description_en: null, sort_order: 4, is_active: true, created_at: new Date().toISOString() },
    ],
    'dummy-stage-3': [
        { id: 'dummy-subject-7', stage_id: 'dummy-stage-3', slug: 'arabic', title_ar: 'اللغة العربية', title_en: 'Arabic', description_ar: null, description_en: null, sort_order: 1, is_active: true, created_at: new Date().toISOString() },
        { id: 'dummy-subject-8', stage_id: 'dummy-stage-3', slug: 'math', title_ar: 'الرياضيات', title_en: 'Math', description_ar: null, description_en: null, sort_order: 2, is_active: true, created_at: new Date().toISOString() },
        { id: 'dummy-subject-9', stage_id: 'dummy-stage-3', slug: 'physics', title_ar: 'الفيزياء', title_en: 'Physics', description_ar: null, description_en: null, sort_order: 3, is_active: true, created_at: new Date().toISOString() },
    ],
};

// ============================================
// TEACHERS
// ============================================
export const dummyTeachers: Partial<Profile>[] = [
    { id: 'dummy-teacher-1', full_name: 'أحمد المعلم', email: 'ahmed.teacher@example.com', role: 'teacher', is_active: true, created_at: new Date().toISOString() },
    { id: 'dummy-teacher-2', full_name: 'فاطمة المعلمة', email: 'fatima.teacher@example.com', role: 'teacher', is_active: true, created_at: new Date().toISOString() },
    { id: 'dummy-teacher-3', full_name: 'محمد الأستاذ', email: 'mohammed.teacher@example.com', role: 'teacher', is_active: false, created_at: new Date().toISOString() },
];

export const dummyTeacherInvites: Partial<TeacherInvite>[] = [
    { id: 'dummy-invite-1', email: 'new.teacher1@example.com', full_name: 'معلم جديد 1', status: 'pending', expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), created_at: new Date().toISOString() },
    { id: 'dummy-invite-2', email: 'new.teacher2@example.com', full_name: 'معلم جديد 2', status: 'pending', expires_at: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(), created_at: new Date().toISOString() },
];

// ============================================
// LESSONS
// ============================================
export const dummyLessons: Array<Partial<Lesson>> = [
    { id: 'dummy-lesson-1', subject_id: 'dummy-subject-1', title_ar: 'الدرس الأول: الحروف الهجائية', title_en: 'Lesson 1: Alphabet', order_index: 1, is_published: true, is_free_preview: true, created_at: new Date().toISOString() },
    { id: 'dummy-lesson-2', subject_id: 'dummy-subject-1', title_ar: 'الدرس الثاني: الحركات', title_en: 'Lesson 2: Vowels', order_index: 2, is_published: true, is_free_preview: false, created_at: new Date().toISOString() },
    { id: 'dummy-lesson-3', subject_id: 'dummy-subject-1', title_ar: 'الدرس الثالث: الكلمات', title_en: 'Lesson 3: Words', order_index: 3, is_published: false, is_free_preview: false, created_at: new Date().toISOString() },
];

// ============================================
// DASHBOARD STATS
// ============================================
export const dummyStats = {
    teachers: 3,
    subjects: 9,
    lessons: 8,
    pendingInvites: 2,
};

// ============================================
// HELPER TO GET SUBJECTS FOR A STAGE
// ============================================
export function getDummySubjectsForStage(stageId: string): Subject[] {
    // Return real dummy subjects or generic ones
    return dummySubjects[stageId] || [
        { id: `dummy-subject-${stageId}-1`, stage_id: stageId, slug: 'general', title_ar: 'مادة عامة', title_en: 'General Subject', description_ar: null, description_en: null, sort_order: 1, is_active: true, created_at: new Date().toISOString() },
    ];
}

// Backward compatibility alias
export function getDummySubjectsForLevel(levelId: string): Subject[] {
    return getDummySubjectsForStage(levelId);
}

