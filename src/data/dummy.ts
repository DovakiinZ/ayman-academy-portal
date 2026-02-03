/**
 * Dummy data for admin pages fallback
 * Used when Supabase returns empty/fails
 */

import type { Level, Subject, Course, Lesson, Profile, TeacherInvite } from '@/types/database';

// ============================================
// LEVELS
// ============================================
export const dummyLevels: Level[] = [
    {
        id: 'dummy-level-1',
        slug: 'kindergarten',
        title_ar: 'تمهيدي',
        title_en: 'Kindergarten',
        sort_order: 1,
        is_active: true,
        created_at: new Date().toISOString(),
    },
    {
        id: 'dummy-level-2',
        slug: 'primary',
        title_ar: 'ابتدائي',
        title_en: 'Primary',
        sort_order: 2,
        is_active: true,
        created_at: new Date().toISOString(),
    },
    {
        id: 'dummy-level-3',
        slug: 'middle',
        title_ar: 'متوسط',
        title_en: 'Middle School',
        sort_order: 3,
        is_active: true,
        created_at: new Date().toISOString(),
    },
];

// ============================================
// SUBJECTS
// ============================================
export const dummySubjects: Record<string, Subject[]> = {
    'dummy-level-1': [
        { id: 'dummy-subject-1', level_id: 'dummy-level-1', slug: 'arabic', title_ar: 'اللغة العربية', title_en: 'Arabic', sort_order: 1, is_active: true, created_at: new Date().toISOString() },
        { id: 'dummy-subject-2', level_id: 'dummy-level-1', slug: 'math', title_ar: 'الرياضيات', title_en: 'Math', sort_order: 2, is_active: true, created_at: new Date().toISOString() },
    ],
    'dummy-level-2': [
        { id: 'dummy-subject-3', level_id: 'dummy-level-2', slug: 'arabic', title_ar: 'اللغة العربية', title_en: 'Arabic', sort_order: 1, is_active: true, created_at: new Date().toISOString() },
        { id: 'dummy-subject-4', level_id: 'dummy-level-2', slug: 'math', title_ar: 'الرياضيات', title_en: 'Math', sort_order: 2, is_active: true, created_at: new Date().toISOString() },
        { id: 'dummy-subject-5', level_id: 'dummy-level-2', slug: 'science', title_ar: 'العلوم', title_en: 'Science', sort_order: 3, is_active: true, created_at: new Date().toISOString() },
        { id: 'dummy-subject-6', level_id: 'dummy-level-2', slug: 'english', title_ar: 'اللغة الإنجليزية', title_en: 'English', sort_order: 4, is_active: true, created_at: new Date().toISOString() },
    ],
    'dummy-level-3': [
        { id: 'dummy-subject-7', level_id: 'dummy-level-3', slug: 'arabic', title_ar: 'اللغة العربية', title_en: 'Arabic', sort_order: 1, is_active: true, created_at: new Date().toISOString() },
        { id: 'dummy-subject-8', level_id: 'dummy-level-3', slug: 'math', title_ar: 'الرياضيات', title_en: 'Math', sort_order: 2, is_active: true, created_at: new Date().toISOString() },
        { id: 'dummy-subject-9', level_id: 'dummy-level-3', slug: 'physics', title_ar: 'الفيزياء', title_en: 'Physics', sort_order: 3, is_active: true, created_at: new Date().toISOString() },
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
// COURSES
// ============================================
export const dummyCourses: Array<Partial<Course> & { teacher?: Partial<Profile>; level?: Partial<Level> }> = [
    {
        id: 'dummy-course-1',
        title_ar: 'أساسيات اللغة العربية',
        title_en: 'Arabic Basics',
        slug: 'arabic-basics',
        description_ar: 'تعلم أساسيات اللغة العربية للمبتدئين',
        teacher_id: 'dummy-teacher-1',
        level_id: 'dummy-level-2',
        is_published: true,
        is_paid: true,
        price_amount: 99,
        created_at: new Date().toISOString(),
        teacher: { full_name: 'أحمد المعلم', email: 'ahmed.teacher@example.com' },
        level: { title_ar: 'ابتدائي' },
    },
    {
        id: 'dummy-course-2',
        title_ar: 'الرياضيات المتقدمة',
        title_en: 'Advanced Math',
        slug: 'advanced-math',
        description_ar: 'دورة شاملة في الرياضيات المتقدمة',
        teacher_id: 'dummy-teacher-2',
        level_id: 'dummy-level-3',
        is_published: true,
        is_paid: false,
        created_at: new Date().toISOString(),
        teacher: { full_name: 'فاطمة المعلمة', email: 'fatima.teacher@example.com' },
        level: { title_ar: 'متوسط' },
    },
    {
        id: 'dummy-course-3',
        title_ar: 'الفيزياء للجميع',
        title_en: 'Physics for All',
        slug: 'physics-for-all',
        description_ar: 'مقدمة في علم الفيزياء',
        teacher_id: 'dummy-teacher-1',
        level_id: 'dummy-level-3',
        is_published: false,
        is_paid: true,
        price_amount: 149,
        created_at: new Date().toISOString(),
        teacher: { full_name: 'أحمد المعلم', email: 'ahmed.teacher@example.com' },
        level: { title_ar: 'متوسط' },
    },
];

// ============================================
// LESSONS
// ============================================
export const dummyLessons: Array<Partial<Lesson>> = [
    { id: 'dummy-lesson-1', course_id: 'dummy-course-1', title_ar: 'الدرس الأول: الحروف الهجائية', title_en: 'Lesson 1: Alphabet', order_index: 1, is_published: true, is_free_preview: true, lesson_type: 'video', created_at: new Date().toISOString() },
    { id: 'dummy-lesson-2', course_id: 'dummy-course-1', title_ar: 'الدرس الثاني: الحركات', title_en: 'Lesson 2: Vowels', order_index: 2, is_published: true, is_free_preview: false, lesson_type: 'video', created_at: new Date().toISOString() },
    { id: 'dummy-lesson-3', course_id: 'dummy-course-1', title_ar: 'الدرس الثالث: الكلمات', title_en: 'Lesson 3: Words', order_index: 3, is_published: false, is_free_preview: false, lesson_type: 'article', created_at: new Date().toISOString() },
];

// ============================================
// DASHBOARD STATS
// ============================================
export const dummyStats = {
    teachers: 3,
    courses: 3,
    lessons: 8,
    pendingInvites: 2,
};

// ============================================
// HELPER TO GET SUBJECTS FOR A LEVEL
// ============================================
export function getDummySubjectsForLevel(levelId: string): Subject[] {
    // Return real dummy subjects or generic ones
    return dummySubjects[levelId] || [
        { id: `dummy-subject-${levelId}-1`, level_id: levelId, slug: 'general', title_ar: 'مادة عامة', title_en: 'General Subject', sort_order: 1, is_active: true, created_at: new Date().toISOString() },
    ];
}
