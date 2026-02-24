// ============================================
// AYMAN ACADEMY - DATABASE TYPES
// ============================================

export type UserRole = 'super_admin' | 'teacher' | 'student';
export type LanguagePref = 'ar' | 'en';
export type InviteStatus = 'pending' | 'accepted' | 'expired' | 'revoked';
export type ContentItemType = 'video' | 'article' | 'image' | 'file' | 'link';

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
    receiver_id: string;
    content: string;
    read_at: string | null;
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

// Database helper type
export type Database = {
    public: {
        Tables: {
            profiles: {
                Row: Profile;
                Insert: Partial<Profile>;
                Update: Partial<Profile>;
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
