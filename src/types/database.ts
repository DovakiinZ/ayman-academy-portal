// ============================================
// AYMAN ACADEMY - DATABASE TYPES
// ============================================

export type UserRole = 'super_admin' | 'teacher' | 'student';
export type LanguagePref = 'ar' | 'en';
export type InviteStatus = 'pending' | 'accepted' | 'expired' | 'revoked';

export interface Profile {
    id: string;
    email: string;
    full_name: string | null;
    role: UserRole;
    avatar_url?: string;
    language_pref?: LanguagePref;
    is_active: boolean;
    created_at?: string;
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

export interface Stage {
    id: string;
    slug: string;
    title_ar: string;
    title_en: string | null;
    sort_order: number;
    is_active: boolean;
    created_at: string;
}

export interface Subject {
    id: string;
    stage_id: string;
    title_ar: string;
    title_en: string | null;
    description_ar: string | null;
    description_en: string | null;
    sort_order: number;
    is_active: boolean;
    created_at: string;
    // Joins
    stage?: Stage;
}

export interface Lesson {
    id: string;
    subject_id: string;
    title_ar: string;
    title_en: string | null;
    summary_ar: string | null;
    summary_en: string | null;
    order_index: number;
    is_published: boolean;
    is_paid: boolean;
    created_by: string;
    created_at: string;
    // Joins
    subject?: Subject;
    content_items?: LessonContentItem[];
}

export interface LessonContentItem {
    id: string;
    lesson_id: string;
    type: 'video' | 'article' | 'image' | 'file' | 'link';
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
    key: string;
    category: string | null;
    content_ar: string | null;
    content_en: string | null;
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
    // replies?: LessonComment[]; // Recursive if needed
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
    // Join
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

// Quizzes (Simplified or Optional - Keeping definitions if table logic persists or is rebuilt)
export interface Quiz {
    id: string;
    lesson_id: string | null;
    is_enabled: boolean;
    is_required: boolean;
    passing_score: number;
    attempts_allowed: number;
    created_at: string;
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
