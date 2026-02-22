// ============================================
// AYMAN ACADEMY - DATABASE TYPES
// ============================================

export type UserRole = 'super_admin' | 'teacher' | 'student' | 'parent';
export type LanguagePref = 'ar' | 'en';
export type InviteStatus = 'pending' | 'accepted' | 'expired' | 'revoked';
export type ContentItemType = 'video' | 'article' | 'image' | 'file' | 'link';
export type StudentGender = 'male' | 'female' | 'unspecified';
export type StudentStage = 'primary' | 'middle' | 'high';

export interface Profile {
    id: string;
    email: string;
    full_name: string | null;
    role: UserRole;
    avatar_url?: string;
    language_pref?: LanguagePref;
    is_active: boolean;
    // Teacher-specific fields
    bio_ar?: string | null;
    bio_en?: string | null;
    show_on_home?: boolean;
    home_order?: number;
    expertise_tags_ar?: string[];
    featured_stages?: string[];
    // Student onboarding fields
    gender?: StudentGender;
    student_stage?: StudentStage | null;
    grade?: number | null;
    created_at: string;
    updated_at?: string;
}

export interface TeacherInvite {
    id: string;
    email: string;
    full_name: string;
    token_hash: string;
    status: InviteStatus;
    expires_at: string;
    created_by: string;
    accepted_by: string | null;
    created_at: string;
}

// Stage (formerly Level) - تمهيدي/ابتدائي/متوسط
export interface Stage {
    id: string;
    slug: string;
    title_ar: string;
    title_en: string | null;
    description_ar?: string | null;
    description_en?: string | null;
    sort_order: number;
    is_active: boolean;
    created_at: string;
}

// Alias for backward compatibility
export type Level = Stage;

export interface Subject {
    id: string;
    stage_id: string;
    slug?: string;
    title_ar: string;
    title_en: string | null;
    description_ar: string | null;
    description_en: string | null;
    sort_order: number;
    is_active: boolean;
    created_at: string;
    // Homepage fields
    show_on_home?: boolean;
    home_order?: number;
    teaser_ar?: string | null;
    teaser_en?: string | null;
    // Joins
    stage?: Stage;
}

export interface Lesson {
    id: string;
    subject_id: string;
    slug?: string;
    title_ar: string;
    title_en: string | null;
    summary_ar: string | null;
    summary_en: string | null;
    order_index: number;
    is_paid: boolean;
    is_published: boolean;
    created_by: string | null;
    created_at: string;
    // Metadata
    objectives_ar?: string | null;
    objectives_en?: string | null;
    prerequisites_ar?: string | null;
    prerequisites_en?: string | null;
    duration_minutes?: number | null;
    cover_image_url?: string | null;
    video_url?: string | null;
    // Legacy fields for backward compatibility
    preview_video_url?: string | null;
    full_video_url?: string | null;
    duration_seconds?: number | null;
    is_free_preview?: boolean;
    // Student Experience fields
    show_on_home?: boolean;
    home_order?: number;
    teaser_ar?: string | null;
    teaser_en?: string | null;
    // Joins
    subject?: Subject;
    content_items?: LessonContentItem[];
}

export interface LessonContentItem {
    id: string;
    lesson_id: string;
    type: ContentItemType;
    title_ar: string | null;
    title_en: string | null;
    body_ar: string | null;
    body_en: string | null;
    url: string | null;
    order_index: number;
    is_published: boolean;
    created_at: string;
}

export interface SystemSetting {
    key: string;
    value: any;
    description: string | null;
    updated_at: string;
}

export interface Course {
    id: string;
    teacher_id: string;
    level_id: string;
    subject_id: string | null;
    slug: string;
    title_ar: string;
    title_en: string | null;
    description_ar: string | null;
    description_en: string | null;
    thumbnail_url?: string | null; // UI uses this
    cover_image_url?: string | null; // DB uses this
    is_published: boolean;
    is_paid: boolean;
    price_amount?: number;
    price_currency?: string;
    created_at: string;
    updated_at: string;
}

export interface ContentTemplate {
    id?: string;
    key: string;
    category: string | null;
    description?: string | null;
    content_ar: string | null;
    content_en: string | null;
    updated_at: string;
}

// New token-based template system
export interface TemplateVariable {
    token: string;
    label_ar: string;
    label_en: string;
}

export type TemplateType = 'certificate' | 'message' | 'email' | 'page_block';

export interface Template {
    id: string;
    key: string;
    title_ar: string;
    title_en: string;
    description: string | null;
    type: TemplateType;
    content_ar: string;
    content_en: string;
    variables: TemplateVariable[];
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

export interface LessonComment {
    id: string;
    lesson_id: string;
    user_id: string;
    content: string;
    is_pinned: boolean;
    created_at: string;
    updated_at: string;
    user?: Profile;
}

export interface LessonRating {
    id: string;
    user_id: string;
    lesson_id: string;
    rating: number;
    comment: string | null;
    created_at: string;
    updated_at?: string;
    user?: Profile;
}

export interface LessonProgress {
    id: string;
    user_id: string;
    lesson_id: string;
    progress_percent: number;
    last_position_seconds: number;
    completed_at: string | null;
    updated_at: string;
    lesson?: Lesson;
}

export interface LessonNote {
    id: string;
    user_id: string;
    lesson_id: string;
    content: string;
    position_seconds: number;
    scroll_position: number;
    created_at: string;
    updated_at: string;
}

export interface Message {
    id: string;
    sender_id: string;
    recipient_id: string | null;
    content: string;
    is_read: boolean;
    created_at: string;
    sender?: Profile;
    receiver?: Profile;
}

export interface AuditLog {
    id: string;
    actor_id: string | null;
    action: string;
    entity_type: string;
    entity_id: string | null;
    metadata: Record<string, unknown> | null;
    created_at: string;
}

// ── Certificate Rule Types ──────────────────

export type CertificateStatus = 'draft' | 'eligible' | 'pending_approval' | 'issued' | 'revoked';

export interface ProgressRule { type: 'progress'; minPercent: number }
export interface FinalExamRule { type: 'final_exam'; minScore: number }
export interface AssignmentRule { type: 'assignment_approved'; required: boolean }
export interface AndRule { type: 'AND'; rules: RuleNode[] }
export interface OrRule { type: 'OR'; rules: RuleNode[] }

export type RuleNode = AndRule | OrRule | ProgressRule | FinalExamRule | AssignmentRule;

export interface CertificateRule {
    id: string;
    subject_id: string;
    enabled: boolean;
    rule_json: RuleNode;
    requires_manual_approval: boolean;
    created_at: string;
    updated_at?: string;
}

export interface MissingRequirement {
    type: 'progress' | 'final_exam' | 'assignment_approved';
    current: number;
    required: number;
}

export interface EligibilityResult {
    eligible: boolean;
    missingRequirements: MissingRequirement[];
}

export interface CertificateSnapshot {
    student_name: string;
    gender: StudentGender;
    course_name: string;
    score: number | null;
    completion_date: string;
    teacher_name: string;
    signer_name: string;
    template_version: string;
}

export interface Certificate {
    id: string;
    student_id: string;
    lesson_id: string | null;
    subject_id: string | null;
    template_id: string | null;
    student_name: string;
    course_name: string;
    subject_name: string | null;
    score: number | null;
    issued_at: string;
    verification_code: string;
    pdf_url: string | null;
    status: CertificateStatus;
    version: number;
    reissued_from_id: string | null;
    snapshot_json: CertificateSnapshot | null;
    created_at: string;
}

export interface Quiz {
    id: string;
    lesson_id: string | null;
    is_enabled: boolean;
    is_required: boolean;
    passing_score: number;
    attempts_allowed: number;
    created_at: string;
}



export type LessonBlockType = 'rich_text' | 'video' | 'image' | 'file' | 'link' | 'tip' | 'warning' | 'example' | 'exercise' | 'qa' | 'equation';

export interface LessonSection {
    id: string;
    lesson_id: string;
    title_ar: string;
    title_en: string | null;
    order_index: number;
    created_at: string;
    // Joins
    blocks?: LessonBlock[];
}

export interface LessonBlock {
    id: string;
    lesson_id: string;
    section_id: string | null;
    type: LessonBlockType;
    title_ar: string | null;
    title_en: string | null;
    content_ar: string | null;
    content_en: string | null;
    url: string | null;
    metadata: Record<string, any> | null;
    order_index: number;
    is_published: boolean;
    created_at: string;
}

export type QuizQuestionType = 'mcq' | 'true_false' | 'multi_select';

export interface LessonQuiz {
    id: string;
    lesson_id: string;
    is_enabled: boolean;
    unlock_after_percent: number;
    passing_score: number;
    created_at: string;
    // Joins
    questions?: LessonQuizQuestion[];
}

export interface LessonQuizQuestion {
    id: string;
    quiz_id: string;
    type: QuizQuestionType;
    question_ar: string;
    question_en: string | null;
    options: any[]; // JSONB
    correct_answer: any; // JSONB
    explanation_ar: string | null;
    explanation_en: string | null;
    order_index: number;
    created_at: string;
}

export interface HomeFeaturedSubject {
    id: string;
    subject_id: string;
    home_order: number;
    is_visible: boolean;
    teaser_ar?: string | null;
    teaser_en?: string | null;
    created_at: string;
    subject?: Subject;
}

export interface HomeFeaturedLesson {
    id: string;
    lesson_id: string;
    home_order: number;
    is_visible: boolean;
    teaser_ar?: string | null;
    teaser_en?: string | null;
    created_at: string;
    lesson?: Lesson;
}

// ============================================
// GAMIFICATION TYPES
// ============================================

export type XPEventType = 'lesson_complete' | 'quiz_pass' | 'streak_day' | 'assignment_submit' | 'certificate_earned' | 'badge_earned';
export type StudentLevelName = 'beginner' | 'learner' | 'scholar' | 'expert';

export interface StudentXP {
    id: string;
    student_id: string;
    event_type: XPEventType;
    points: number;
    source_id: string | null;
    created_at: string;
}

export interface StudentLevel {
    student_id: string;
    total_xp: number;
    current_level: StudentLevelName;
    streak_days: number;
    last_activity_date: string | null;
    updated_at: string;
}

export interface Badge {
    id: string;
    key: string;
    name_ar: string;
    name_en: string;
    description_ar: string | null;
    description_en: string | null;
    icon: string;
    criteria_type: 'streak' | 'score' | 'courses_completed' | 'speed' | 'xp_total' | 'custom';
    criteria_value: number;
    sort_order: number;
    created_at: string;
}

export interface StudentBadge {
    id: string;
    student_id: string;
    badge_id: string;
    earned_at: string;
    badge?: Badge;
}

// ============================================
// PARENT TYPES
// ============================================

export interface ParentLink {
    id: string;
    parent_id: string;
    student_id: string;
    linked_at: string;
    student?: Profile;
}

// ============================================
// EVALUATION & COACH TYPES
// ============================================

export interface TeacherEvaluation {
    id: string;
    subject_id: string;
    quality_score: number;
    difficulty_balance_score: number;
    engagement_score: number;
    dropout_risk: number;
    detected_issues: string[];
    recommendations: string[];
    evaluated_at: string;
}

export interface CourseQualityReport {
    qualityScore: number;
    difficultyBalanceScore: number;
    engagementScore: number;
    dropoutRisk: number;
    detectedIssues: string[];
    recommendations: string[];
}

export interface StudentCoachReport {
    riskScore: number;
    strengths: string[];
    weaknesses: string[];
    suggestedLessons: { id: string; title: string }[];
    motivationalMessage: string;
}

export interface ParentStudentReport {
    progressPercent: number;
    weeklyLessonsCompleted: number;
    avgScore: number;
    timeSpentMinutes: number;
    strengths: string[];
    weaknesses: string[];
    comparisonToClassAverage: number;
}

// Database helper type
export type Database = {
    public: {
        Tables: {
            profiles: {
                Row: Profile;
                Insert: Partial<Profile>;
                Update: Partial<Profile>;
            };
            courses: {
                Row: Course;
                Insert: Partial<Course>;
                Update: Partial<Course>;
            };
            stages: {
                Row: Stage;
                Insert: Partial<Stage>;
                Update: Partial<Stage>;
            };
            subjects: {
                Row: Subject;
                Insert: Partial<Subject>;
                Update: Partial<Subject>;
            };
            lessons: {
                Row: Lesson;
                Insert: Partial<Lesson>;
                Update: Partial<Lesson>;
            };
            lesson_content_items: {
                Row: LessonContentItem;
                Insert: Partial<LessonContentItem>;
                Update: Partial<LessonContentItem>;
            };
            system_settings: {
                Row: SystemSetting;
                Insert: Partial<SystemSetting>;
                Update: Partial<SystemSetting>;
            };
            content_templates: {
                Row: ContentTemplate;
                Insert: Partial<ContentTemplate>;
                Update: Partial<ContentTemplate>;
            };
            lesson_comments: {
                Row: LessonComment;
                Insert: Partial<LessonComment>;
                Update: Partial<LessonComment>;
            };
            lesson_ratings: {
                Row: LessonRating;
                Insert: Partial<LessonRating>;
                Update: Partial<LessonRating>;
            };
            lesson_progress: {
                Row: LessonProgress;
                Insert: Partial<LessonProgress>;
                Update: Partial<LessonProgress>;
            };
            lesson_notes: {
                Row: LessonNote;
                Insert: Partial<LessonNote>;
                Update: Partial<LessonNote>;
            };
            home_featured_subjects: {
                Row: HomeFeaturedSubject;
                Insert: Partial<HomeFeaturedSubject>;
                Update: Partial<HomeFeaturedSubject>;
            };
            home_featured_lessons: {
                Row: HomeFeaturedLesson;
                Insert: Partial<HomeFeaturedLesson>;
                Update: Partial<HomeFeaturedLesson>;
            };
            messages: {
                Row: Message;
                Insert: Partial<Message>;
                Update: Partial<Message>;
            };
            audit_logs: {
                Row: AuditLog;
                Insert: Partial<AuditLog>;
                Update: never;
            };
            teacher_invites: {
                Row: TeacherInvite;
                Insert: Partial<TeacherInvite>;
                Update: Partial<TeacherInvite>;
            };
            lesson_sections: {
                Row: LessonSection;
                Insert: Partial<LessonSection>;
                Update: Partial<LessonSection>;
            };
            lesson_blocks: {
                Row: LessonBlock;
                Insert: Partial<LessonBlock>;
                Update: Partial<LessonBlock>;
            };
            lesson_quizzes: {
                Row: LessonQuiz;
                Insert: Partial<LessonQuiz>;
                Update: Partial<LessonQuiz>;
            };
            lesson_quiz_questions: {
                Row: LessonQuizQuestion;
                Insert: Partial<LessonQuizQuestion>;
                Update: Partial<LessonQuizQuestion>;
            };
            templates: {
                Row: Template;
                Insert: Partial<Template>;
                Update: Partial<Template>;
            };
            certificate_rules: {
                Row: CertificateRule;
                Insert: Partial<CertificateRule>;
                Update: Partial<CertificateRule>;
            };
            student_xp: {
                Row: StudentXP;
                Insert: Partial<StudentXP>;
                Update: Partial<StudentXP>;
            };
            student_levels: {
                Row: StudentLevel;
                Insert: Partial<StudentLevel>;
                Update: Partial<StudentLevel>;
            };
            badges: {
                Row: Badge;
                Insert: Partial<Badge>;
                Update: Partial<Badge>;
            };
            student_badges: {
                Row: StudentBadge;
                Insert: Partial<StudentBadge>;
                Update: Partial<StudentBadge>;
            };
            parent_links: {
                Row: ParentLink;
                Insert: Partial<ParentLink>;
                Update: Partial<ParentLink>;
            };
            certificates: {
                Row: Certificate;
                Insert: Partial<Certificate>;
                Update: Partial<Certificate>;
            };
            teacher_evaluations: {
                Row: TeacherEvaluation;
                Insert: Partial<TeacherEvaluation>;
                Update: Partial<TeacherEvaluation>;
            };
        };
        Functions: {
            get_student_teachers: {
                Args: { student_uuid: string };
                Returns: { teacher_id: string; teacher_name: string; subject_title: string }[];
            };
            check_lesson_access: {
                Args: { p_user_id: string; p_lesson_id: string };
                Returns: boolean;
            };
        };
    };
};
