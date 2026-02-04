/**
 * Dummy data for quiz system fallback
 * Used when Supabase returns empty/fails
 */

import type { Quiz, QuizQuestion, QuizOption, QuizAttempt } from '@/types/database';

// ============================================
// DUMMY QUIZZES
// ============================================

export const dummyQuizzes: Quiz[] = [
    {
        id: 'dummy-quiz-1',
        created_by: 'dummy-teacher-1',
        attachment_type: 'lesson',
        lesson_id: 'dummy-lesson-1',
        course_id: null,
        title_ar: 'اختبار قصير: الحروف الهجائية',
        title_en: 'Quick Quiz: Arabic Alphabet',
        is_enabled: true,
        is_required: false,
        is_published: true,
        attempts_allowed: 0, // unlimited
        show_answers_after_submit: true,
        passing_score_percent: null,
        randomize_questions: false,
        time_limit_minutes: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        questions_count: 3,
        attempts_count: 12,
    },
    {
        id: 'dummy-quiz-2',
        created_by: 'dummy-teacher-2',
        attachment_type: 'course',
        lesson_id: null,
        course_id: 'dummy-course-2',
        title_ar: 'الاختبار النهائي: الرياضيات المتقدمة',
        title_en: 'Final Exam: Advanced Math',
        is_enabled: true,
        is_required: true,
        is_published: true,
        attempts_allowed: 2,
        show_answers_after_submit: true,
        passing_score_percent: 70,
        randomize_questions: true,
        time_limit_minutes: 30,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        questions_count: 10,
        attempts_count: 45,
    },
    {
        id: 'dummy-quiz-3',
        created_by: 'dummy-teacher-1',
        attachment_type: 'lesson',
        lesson_id: 'dummy-lesson-2',
        course_id: null,
        title_ar: 'تمرين: الحركات',
        title_en: 'Exercise: Vowels',
        is_enabled: true,
        is_required: false,
        is_published: false, // draft
        attempts_allowed: 0,
        show_answers_after_submit: true,
        passing_score_percent: null,
        randomize_questions: false,
        time_limit_minutes: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        questions_count: 5,
        attempts_count: 0,
    },
];

// ============================================
// DUMMY QUESTIONS
// ============================================

export const dummyQuestions: QuizQuestion[] = [
    {
        id: 'dummy-question-1',
        quiz_id: 'dummy-quiz-1',
        question_type: 'mcq',
        question_text_ar: 'ما هو أول حرف في الأبجدية العربية؟',
        question_text_en: 'What is the first letter of the Arabic alphabet?',
        image_url: null,
        explanation_ar: 'حرف الألف هو أول حرف في الأبجدية العربية',
        explanation_en: 'Alif is the first letter of the Arabic alphabet',
        points: 1,
        order_index: 0,
        created_at: new Date().toISOString(),
        options: [
            { id: 'opt-1-1', question_id: 'dummy-question-1', option_text_ar: 'أ (الألف)', option_text_en: 'Alif', image_url: null, is_correct: true, order_index: 0 },
            { id: 'opt-1-2', question_id: 'dummy-question-1', option_text_ar: 'ب (الباء)', option_text_en: 'Ba', image_url: null, is_correct: false, order_index: 1 },
            { id: 'opt-1-3', question_id: 'dummy-question-1', option_text_ar: 'ت (التاء)', option_text_en: 'Ta', image_url: null, is_correct: false, order_index: 2 },
            { id: 'opt-1-4', question_id: 'dummy-question-1', option_text_ar: 'ث (الثاء)', option_text_en: 'Tha', image_url: null, is_correct: false, order_index: 3 },
        ],
    },
    {
        id: 'dummy-question-2',
        quiz_id: 'dummy-quiz-1',
        question_type: 'true_false',
        question_text_ar: 'اللغة العربية تُكتب من اليمين إلى اليسار',
        question_text_en: 'Arabic is written from right to left',
        image_url: null,
        explanation_ar: 'نعم، اللغة العربية تُكتب من اليمين إلى اليسار',
        explanation_en: 'Yes, Arabic is written from right to left',
        points: 1,
        order_index: 1,
        created_at: new Date().toISOString(),
        options: [
            { id: 'opt-2-1', question_id: 'dummy-question-2', option_text_ar: 'صحيح', option_text_en: 'True', image_url: null, is_correct: true, order_index: 0 },
            { id: 'opt-2-2', question_id: 'dummy-question-2', option_text_ar: 'خطأ', option_text_en: 'False', image_url: null, is_correct: false, order_index: 1 },
        ],
    },
    {
        id: 'dummy-question-3',
        quiz_id: 'dummy-quiz-1',
        question_type: 'multi_select',
        question_text_ar: 'اختر جميع الحروف المتصلة:',
        question_text_en: 'Select all connecting letters:',
        image_url: null,
        explanation_ar: 'الباء والتاء والثاء من الحروف المتصلة',
        explanation_en: 'Ba, Ta, and Tha are connecting letters',
        points: 2,
        order_index: 2,
        created_at: new Date().toISOString(),
        options: [
            { id: 'opt-3-1', question_id: 'dummy-question-3', option_text_ar: 'ب (الباء)', option_text_en: 'Ba', image_url: null, is_correct: true, order_index: 0 },
            { id: 'opt-3-2', question_id: 'dummy-question-3', option_text_ar: 'ت (التاء)', option_text_en: 'Ta', image_url: null, is_correct: true, order_index: 1 },
            { id: 'opt-3-3', question_id: 'dummy-question-3', option_text_ar: 'ث (الثاء)', option_text_en: 'Tha', image_url: null, is_correct: true, order_index: 2 },
            { id: 'opt-3-4', question_id: 'dummy-question-3', option_text_ar: 'و (الواو)', option_text_en: 'Waw', image_url: null, is_correct: false, order_index: 3 },
        ],
    },
];

// ============================================
// DUMMY OPTIONS (for direct access)
// ============================================

export const dummyOptions: QuizOption[] = dummyQuestions.flatMap(q => q.options || []);

// ============================================
// DUMMY ATTEMPTS
// ============================================

export const dummyAttempts: QuizAttempt[] = [
    {
        id: 'dummy-attempt-1',
        quiz_id: 'dummy-quiz-1',
        student_id: 'dummy-student-1',
        score_percent: 100,
        total_points: 4,
        earned_points: 4,
        answers: [
            { question_id: 'dummy-question-1', selected_options: ['opt-1-1'], is_correct: true },
            { question_id: 'dummy-question-2', selected_options: ['opt-2-1'], is_correct: true },
            { question_id: 'dummy-question-3', selected_options: ['opt-3-1', 'opt-3-2', 'opt-3-3'], is_correct: true },
        ],
        passed: true,
        started_at: new Date(Date.now() - 600000).toISOString(),
        submitted_at: new Date(Date.now() - 300000).toISOString(),
        time_spent_seconds: 300,
    },
];

// ============================================
// HELPER: Get questions for a quiz
// ============================================

export function getDummyQuestionsForQuiz(quizId: string): QuizQuestion[] {
    return dummyQuestions.filter(q => q.quiz_id === quizId);
}

// ============================================
// HELPER: Get quiz by lesson
// ============================================

export function getDummyQuizForLesson(lessonId: string): Quiz | null {
    return dummyQuizzes.find(q => q.lesson_id === lessonId && q.is_enabled && q.is_published) || null;
}

// ============================================
// HELPER: Get quiz by course
// ============================================

export function getDummyQuizForCourse(courseId: string): Quiz | null {
    return dummyQuizzes.find(q => q.course_id === courseId && q.is_enabled && q.is_published) || null;
}
