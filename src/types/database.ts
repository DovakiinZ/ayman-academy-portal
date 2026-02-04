// ============================================
// AYMAN ACADEMY - DATABASE TYPES
// ============================================

// Enums
export type UserRole = 'super_admin' | 'teacher' | 'student';
export type LanguagePref = 'ar' | 'en';
export type InviteStatus = 'pending' | 'accepted' | 'expired' | 'revoked';
export type ResourceType = 'pdf' | 'link' | 'worksheet' | 'other';
export type PlanScope = 'all' | 'level' | 'subject' | 'course';
export type SubscriptionStatus = 'active' | 'inactive' | 'canceled' | 'expired' | 'pending';
export type ContentItemType = 'video' | 'article' | 'image' | 'file' | 'link';
export type TemplateContentType = 'plain' | 'rich' | 'json';

// ============================================
// ENTITIES
// ============================================

export interface Profile {
    id: string;
    full_name: string | null;
    email: string;
    role: UserRole;
    avatar_url: string | null;
    language_pref: LanguagePref;
    is_active: boolean;
    created_at: string;
    updated_at: string;
    // Homepage featured teacher fields
    bio_ar?: string | null;
    bio_en?: string | null;
    expertise_tags_ar?: string[] | null;
    show_on_home?: boolean;
    home_order?: number;
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

export interface Level {
    id: string;
    slug: string;
    title_ar: string;
    title_en: string | null;
    description_ar: string | null;
    description_en: string | null;
    sort_order: number;
    is_active: boolean;
    created_at: string;
}

export interface Subject {
    id: string;
    level_id: string;
    slug: string;
    title_ar: string;
    title_en: string | null;
    description_ar: string | null;
    description_en: string | null;
    sort_order: number;
    is_active: boolean;
    created_at: string;
    // Joined
    level?: Level;
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
    cover_image_url: string | null;
    is_published: boolean;
    is_paid: boolean;
    price_amount: number | null;
    price_currency: string;
    created_at: string;
    updated_at: string;
    // Joined
    teacher?: Profile;
    level?: Level;
    subject?: Subject;
    lessons_count?: number;
}

export interface Lesson {
    id: string;
    course_id: string | null; // Nullable for new subject-based lessons
    subject_id: string | null; // New: lessons can belong directly to subjects
    slug: string;
    title_ar: string;
    title_en: string | null;
    summary_ar: string | null;
    summary_en: string | null;
    duration_seconds: number | null;
    order_index: number;
    preview_video_url: string | null;
    full_video_url: string | null;
    is_free_preview: boolean;
    is_published: boolean;
    is_paid: boolean;
    created_at: string;
    updated_at: string;
    // Joined
    course?: Course;
    subject?: Subject;
    content_items?: LessonContentItem[];
}

export interface LessonResource {
    id: string;
    lesson_id: string;
    type: ResourceType;
    title_ar: string;
    title_en: string | null;
    url: string;
    created_at: string;
}

export interface LessonContentItem {
    id: string;
    lesson_id: string;
    content_type: ContentItemType;
    title_ar: string;
    title_en: string | null;
    body_ar: string | null; // For articles
    body_en: string | null;
    url: string | null; // For video/file/link/image
    metadata: Record<string, unknown>;
    order_index: number;
    is_published: boolean;
    created_at: string;
    updated_at: string;
}

export interface ContentItem {
    id: string;
    subject_id: string;
    type: ContentItemType;
    title_ar: string;
    title_en: string | null;
    content_url: string | null;
    content_text: string | null;
    is_published: boolean;
    is_free_preview: boolean;
    order_index: number;
    created_at: string;
    updated_at: string;
    // Joined
    subject?: Course;
}

export interface HomeFeaturedSubject {
    id: string;
    subject_id: string;
    teaser_ar: string | null;
    teaser_en: string | null;
    is_visible: boolean;
    home_order: number;
    created_at: string;
    // Joined
    subject?: Subject;
}

export interface HomeFeaturedLesson {
    id: string;
    lesson_id: string;
    teaser_ar: string | null;
    teaser_en: string | null;
    is_visible: boolean;
    home_order: number;
    created_at: string;
    // Joined
    lesson?: Lesson;
}

export interface Plan {
    id: string;
    code: string;
    title_ar: string;
    title_en: string | null;
    description_ar: string | null;
    description_en: string | null;
    scope: PlanScope;
    level_id: string | null;
    subject_id: string | null;
    course_id: string | null;
    price_amount: number | null;
    price_currency: string;
    is_active: boolean;
    created_at: string;
}

export interface Subscription {
    id: string;
    user_id: string;
    plan_id: string;
    status: SubscriptionStatus;
    starts_at: string;
    ends_at: string | null;
    created_by: string | null;
    created_at: string;
    // Joined
    plan?: Plan;
    user?: Profile;
}

export interface AccessGrant {
    id: string;
    user_id: string;
    course_id: string | null;
    subject_id: string | null;
    level_id: string | null;
    reason: string | null;
    granted_by: string;
    starts_at: string;
    ends_at: string | null;
    created_at: string;
}

export interface LessonProgress {
    id: string;
    user_id: string;
    lesson_id: string;
    progress_percent: number;
    last_position_seconds: number;
    completed_at: string | null;
    updated_at: string;
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

// ============================================
// STUDENT FEATURES
// ============================================

export interface Message {
    id: string;
    sender_id: string;
    receiver_id: string;
    content: string;
    read_at: string | null;
    created_at: string;
    // Joined
    sender?: Profile;
    receiver?: Profile;
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

export interface LessonComment {
    id: string;
    user_id: string;
    lesson_id: string;
    parent_id: string | null;
    content: string;
    is_pinned: boolean; // Added field
    created_at: string;
    updated_at: string;
    // Joined
    user?: Profile;
    replies?: LessonComment[];
}

export interface LessonRating {
    id: string;
    user_id: string;
    lesson_id: string;
    rating: number;
    comment: string | null;
    created_at: string;
    updated_at: string;
    // Joined
    user?: Profile;
}


// ============================================
// QUIZ SYSTEM
// ============================================

export type QuizAttachmentType = 'lesson' | 'course';
export type QuestionType = 'mcq' | 'true_false' | 'multi_select' | 'image_choice';

export interface Quiz {
    id: string;
    created_by: string;
    attachment_type: QuizAttachmentType;
    lesson_id: string | null;
    course_id: string | null;
    title_ar: string;
    title_en: string | null;
    is_enabled: boolean;
    is_required: boolean;
    is_published: boolean;
    attempts_allowed: number; // 0 = unlimited
    show_answers_after_submit: boolean;
    passing_score_percent: number | null;
    randomize_questions: boolean;
    time_limit_minutes: number | null;
    created_at: string;
    updated_at: string;
    // Joined
    questions?: QuizQuestion[];
    lesson?: Lesson;
    course?: Course;
    creator?: Profile;
    questions_count?: number;
    attempts_count?: number;
}

export interface QuizQuestion {
    id: string;
    quiz_id: string;
    question_type: QuestionType;
    question_text_ar: string;
    question_text_en: string | null;
    image_url: string | null;
    explanation_ar: string | null;
    explanation_en: string | null;
    points: number;
    order_index: number;
    created_at: string;
    // Joined
    options?: QuizOption[];
}

export interface QuizOption {
    id: string;
    question_id: string;
    option_text_ar: string;
    option_text_en: string | null;
    image_url: string | null;
    is_correct: boolean;
    order_index: number;
}

export interface QuizAttempt {
    id: string;
    quiz_id: string;
    student_id: string;
    score_percent: number;
    total_points: number;
    earned_points: number;
    answers: QuizAnswer[];
    passed: boolean | null;
    started_at: string;
    submitted_at: string;
    time_spent_seconds: number | null;
    // Joined
    quiz?: Quiz;
    student?: Profile;
}

export interface QuizAnswer {
    question_id: string;
    selected_options: string[];
    is_correct: boolean;
}

export interface ContentTemplate {
    id: string;
    key: string;
    type: TemplateContentType;
    description: string | null;
    category: string | null;
    content_ar: string | null;
    content_en: string | null;
    is_public: boolean;
    created_at: string;
    updated_at: string;
    updated_by: string | null;
}

// ============================================
// DATABASE SCHEMA TYPE
// ============================================

export interface Database {
    public: {
        Tables: {
            profiles: {
                Row: Profile;
                Insert: Omit<Profile, 'created_at' | 'updated_at'>;
                Update: Partial<Omit<Profile, 'id'>>;
            };
            teacher_invites: {
                Row: TeacherInvite;
                Insert: Omit<TeacherInvite, 'id' | 'created_at'>;
                Update: Partial<Omit<TeacherInvite, 'id'>>;
            };
            levels: {
                Row: Level;
                Insert: Omit<Level, 'id' | 'created_at'>;
                Update: Partial<Omit<Level, 'id'>>;
            };
            subjects: {
                Row: Subject;
                Insert: Omit<Subject, 'id' | 'created_at'>;
                Update: Partial<Omit<Subject, 'id'>>;
            };
            courses: {
                Row: Course;
                Insert: Omit<Course, 'id' | 'created_at' | 'updated_at'>;
                Update: Partial<Omit<Course, 'id' | 'teacher_id'>>;
            };
            lessons: {
                Row: Lesson;
                Insert: Omit<Lesson, 'id' | 'created_at' | 'updated_at'>;
                Update: Partial<Omit<Lesson, 'id' | 'course_id'>>;
            };
            lesson_resources: {
                Row: LessonResource;
                Insert: Omit<LessonResource, 'id' | 'created_at'>;
                Update: Partial<Omit<LessonResource, 'id'>>;
            };
            plans: {
                Row: Plan;
                Insert: Omit<Plan, 'id' | 'created_at'>;
                Update: Partial<Omit<Plan, 'id'>>;
            };
            subscriptions: {
                Row: Subscription;
                Insert: Omit<Subscription, 'id' | 'created_at'>;
                Update: Partial<Omit<Subscription, 'id'>>;
            };
            access_grants: {
                Row: AccessGrant;
                Insert: Omit<AccessGrant, 'id' | 'created_at'>;
                Update: Partial<Omit<AccessGrant, 'id'>>;
            };
            lesson_progress: {
                Row: LessonProgress;
                Insert: Omit<LessonProgress, 'id' | 'updated_at'>;
                Update: Partial<Omit<LessonProgress, 'id'>>;
            };
            audit_logs: {
                Row: AuditLog;
                Insert: Omit<AuditLog, 'id' | 'created_at'>;
                Update: never;
            };
            messages: {
                Row: Message;
                Insert: Omit<Message, 'id' | 'created_at' | 'read_at'>;
                Update: Partial<Omit<Message, 'id' | 'created_at'>>;
            };
            lesson_notes: {
                Row: LessonNote;
                Insert: Omit<LessonNote, 'id' | 'created_at' | 'updated_at'>;
                Update: Partial<Omit<LessonNote, 'id' | 'created_at'>>;
            };
            lesson_comments: {
                Row: LessonComment;
                Insert: Omit<LessonComment, 'id' | 'created_at'>;
                Update: Partial<Omit<LessonComment, 'id' | 'created_at'>>;
            };
            lesson_ratings: {
                Row: LessonRating;
                Insert: Omit<LessonRating, 'id' | 'created_at' | 'updated_at'>;
                Update: Partial<Omit<LessonRating, 'id' | 'created_at'>>;
            };
            content_items: {
                Row: ContentItem;
                Insert: Omit<ContentItem, 'id' | 'created_at' | 'updated_at'>;
                Update: Partial<Omit<ContentItem, 'id' | 'subject_id'>>;
            };
            quizzes: {
                Row: Quiz;
                Insert: Omit<Quiz, 'id' | 'created_at' | 'updated_at' | 'questions' | 'lesson' | 'course' | 'creator' | 'questions_count' | 'attempts_count'>;
                Update: Partial<Omit<Quiz, 'id' | 'created_by'>>;
            };
            content_templates: {
                Row: ContentTemplate;
                Insert: Omit<ContentTemplate, 'id' | 'created_at' | 'updated_at'>;
                Update: Partial<Omit<ContentTemplate, 'id' | 'created_at'>>;
            };
            quiz_questions: {
                Row: QuizQuestion;
                Insert: Omit<QuizQuestion, 'id' | 'created_at' | 'options'>;
                Update: Partial<Omit<QuizQuestion, 'id' | 'quiz_id'>>;
            };
            quiz_options: {
                Row: QuizOption;
                Insert: Omit<QuizOption, 'id'>;
                Update: Partial<Omit<QuizOption, 'id' | 'question_id'>>;
            };
            quiz_attempts: {
                Row: QuizAttempt;
                Insert: Omit<QuizAttempt, 'id' | 'started_at' | 'quiz' | 'student'>;
                Update: Partial<Omit<QuizAttempt, 'id' | 'quiz_id' | 'student_id'>>;
            };
            home_featured_subjects: {
                Row: HomeFeaturedSubject;
                Insert: Omit<HomeFeaturedSubject, 'id' | 'created_at' | 'subject'>;
                Update: Partial<Omit<HomeFeaturedSubject, 'id' | 'subject_id'>>;
            };
            home_featured_lessons: {
                Row: HomeFeaturedLesson;
                Insert: Omit<HomeFeaturedLesson, 'id' | 'created_at' | 'lesson'>;
                Update: Partial<Omit<HomeFeaturedLesson, 'id' | 'lesson_id'>>;
            };
        };
        Functions: {
            check_lesson_access: {
                Args: { p_user_id: string; p_lesson_id: string };
                Returns: boolean;
            };
        };
    };
}
