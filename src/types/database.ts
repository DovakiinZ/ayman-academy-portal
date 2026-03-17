// ============================================
// AYMAN ACADEMY - DATABASE TYPES
// ============================================

export type UserRole = 'super_admin' | 'teacher' | 'student';
export type LanguagePref = 'ar' | 'en';
export type InviteStatus = 'pending' | 'accepted' | 'expired' | 'revoked';
export type SubjectAccessType = 'public' | 'stage' | 'subscription' | 'invite_only' | 'org_only';
export type StudentStage = 'kindergarten' | 'primary' | 'middle' | 'high';
export type StudentGender = 'male' | 'female' | 'unspecified';

export interface Profile {
    id: string;
    email: string;
    full_name: string | null;
    role: UserRole;
    avatar_url?: string;
    language_pref?: LanguagePref;
    is_active: boolean;
    // Student onboarding fields
    student_stage?: StudentStage | null;
    grade?: number | null;
    gender?: 'male' | 'female' | 'unspecified' | null;
    // Teacher-specific fields
    bio_ar?: string | null;
    bio_en?: string | null;
    show_on_home?: boolean;
    home_order?: number;
    expertise_tags_ar?: string[];
    // Teacher-specific additional fields
    phone?: string | null;
    qualifications?: string | null;
    // Sham Cash payment details (teachers)
    shamcash_account_name?: string | null;
    shamcash_account_number?: string | null;
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
    teaser_ar?: string | null;
    teaser_en?: string | null;
    sort_order: number;
    is_active: boolean;
    show_on_home?: boolean;
    home_order?: number;
    created_at: string;
}

// Alias for backward compatibility
export type Level = Stage;

export interface Subject {
    id: string;
    stage_id: string | null;
    teacher_id?: string | null;
    slug?: string;
    title_ar: string;
    title_en: string | null;
    description_ar: string | null;
    description_en: string | null;
    access_type?: SubjectAccessType;
    sort_order: number;
    is_active: boolean;
    is_published?: boolean;
    // From courses
    cover_image_url?: string | null;
    is_paid?: boolean;
    price_amount?: number | null;
    price_currency?: string | null;
    // Homepage fields
    show_on_home?: boolean;
    home_order?: number;
    teaser_ar?: string | null;
    teaser_en?: string | null;
    created_at: string;
    updated_at?: string;
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
    sort_order: number;
    is_paid: boolean;
    is_published: boolean;
    created_by: string | null;
    created_at: string;
    updated_at?: string;
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

// Unified rating (replaces LessonRating)
export interface Rating {
    id: string;
    user_id: string;
    entity_type: 'lesson' | 'subject' | 'teacher';
    entity_id: string;
    stars: number;
    comment: string | null;
    created_at: string;
    updated_at?: string;
    user?: Profile;
}

// Keep LessonRating as alias for backward compat during migration
export type LessonRating = Rating;

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

export type LessonBlockType = 'rich_text' | 'video' | 'image' | 'file' | 'link' | 'tip' | 'warning' | 'example' | 'exercise' | 'qa' | 'equation';

export interface LessonSection {
    id: string;
    lesson_id: string;
    title_ar: string;
    title_en: string | null;
    sort_order: number;
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
    sort_order: number;
    is_published: boolean;
    created_at: string;
}

export type QuizQuestionType = 'mcq' | 'true_false' | 'multi_select';

// Quiz (replaces LessonQuiz — supports lesson-level AND subject-level)
export interface Quiz {
    id: string;
    lesson_id: string | null;
    subject_id: string | null;
    title_ar?: string | null;
    title_en?: string | null;
    is_enabled: boolean;
    is_required: boolean;
    passing_score: number;
    attempts_allowed: number;
    unlock_after_percent?: number;
    created_at: string;
    // Joins
    questions?: QuizQuestion[];
}

// Keep LessonQuiz as alias for backward compat
export type LessonQuiz = Quiz;

// Quiz question (replaces LessonQuizQuestion — options in separate table)
export interface QuizQuestion {
    id: string;
    quiz_id: string;
    type: QuizQuestionType;
    question_ar: string;
    question_en: string | null;
    explanation_ar: string | null;
    explanation_en: string | null;
    sort_order: number;
    created_at: string;
    // Joins
    options?: QuizOption[];
}

// Keep LessonQuizQuestion as alias
export type LessonQuizQuestion = QuizQuestion;

export interface QuizOption {
    id: string;
    question_id: string;
    text_ar: string;
    text_en: string | null;
    is_correct: boolean;
    sort_order: number;
}

export interface QuizAttempt {
    id: string;
    quiz_id: string;
    student_id: string;
    score_percent: number;
    answers: any;
    started_at: string;
    completed_at: string | null;
}

// ── Certificate Types ──

export type CertificateStatus = 'draft' | 'eligible' | 'pending_approval' | 'issued' | 'revoked';

export interface CertificateSnapshot {
    student_name: string;
    gender?: string;
    student_stage?: string;
    course_name: string;
    score: number | null;
    completion_date: string;
    teacher_name: string;
    signer_name: string;
    signer_role?: string;
    template_version: string;
    reissue_reason?: string;
    // Ratings & remarks (snapshotted at issuance)
    average_rating?: number | null;
    total_ratings?: number | null;
    teacher_remarks?: string | null;
}

export interface Certificate {
    id: string;
    student_id: string;
    subject_id: string | null;
    template_id: string | null;
    student_name: string;
    student_email?: string | null;
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
    template_version: number;
    render_mode?: 'official' | 'live';
    created_at: string;
}

export interface CertificateReissueLog {
    id: string;
    student_id: string;
    old_certificate_id: string;
    new_certificate_id: string | null;
    created_at: string;
}

export interface RuleNode {
    type: 'AND' | 'OR' | 'progress' | 'final_exam' | 'assignment_approved';
    rules?: RuleNode[];
    minPercent?: number;
    minScore?: number;
    required?: boolean;
}

export interface CertificateRule {
    id: string;
    subject_id: string;
    enabled: boolean;
    rule_json: RuleNode;
    requires_manual_approval: boolean;
    created_at: string;
    updated_at: string;
}

export interface MissingRequirement {
    type: string;
    current: number;
    required: number;
}

export interface EligibilityResult {
    eligible: boolean;
    missingRequirements: MissingRequirement[];
}

// ── Teacher Application Types ─────────────────────────────

export type TeacherApplicationStatus = 'pending' | 'approved' | 'rejected';

export interface TeacherApplication {
    id: string;
    full_name: string;
    email: string;
    phone: string | null;
    bio: string | null;
    profession: string | null;
    major: string | null;
    grades_taught: string | null;
    status: TeacherApplicationStatus;
    admin_notes: string | null;
    reviewed_by: string | null;
    created_at: string;
    updated_at: string;
}

// ── Order / Marketplace Types ─────────────────────────────

export type OrderStatus = 'pending_payment' | 'paid' | 'rejected' | 'cancelled';

export interface Order {
    id: string;
    student_id: string;
    subject_id: string;
    teacher_id: string;
    status: OrderStatus;
    amount: number;
    currency: string;
    student_full_name: string;
    student_payment_account: string;
    teacher_notes: string | null;
    paid_at: string | null;
    reviewed_by: string | null;
    created_at: string;
    updated_at: string;
    // Joins
    student?: Profile;
    subject?: Subject;
    teacher?: Profile;
}

// ── Subject Access Control Types ──────────────────────────

export interface StudentSubject {
    id: string;
    student_id: string;
    subject_id: string;
    status: 'active' | 'inactive';
    assigned_by: 'admin' | 'teacher' | 'system';
    assigned_reason?: string | null;
    created_at: string;
}

export interface Plan {
    id: string;
    name_ar: string;
    name_en: string | null;
    description_ar: string | null;
    description_en: string | null;
    billing: 'monthly' | 'yearly' | 'lifetime';
    price_cents: number;
    currency: string;
    stage_id: string | null;
    is_family: boolean;
    max_members: number | null;
    is_active: boolean;
    sort_order: number;
    created_at: string;
    updated_at: string;
}

export interface PlanSubject {
    id: string;
    plan_id: string;
    subject_id: string;
}

export interface Subscription {
    id: string;
    owner_user_id: string;
    student_id: string | null;
    plan_id: string;
    status: 'trialing' | 'active' | 'past_due' | 'expired' | 'cancelled';
    starts_at: string;
    ends_at: string | null;
    trial_ends_at: string | null;
    provider: 'manual' | 'stripe' | 'tap' | 'hyperpay';
    provider_ref: string | null;
    created_at: string;
    updated_at: string;
    // Joins
    plan?: Plan;
}

export interface FamilyMember {
    id: string;
    subscription_id: string;
    student_id: string;
    status: 'active' | 'removed';
    created_at: string;
}

export interface SubjectInvite {
    id: string;
    student_id: string;
    subject_id: string;
    status: 'active' | 'revoked';
    invited_by_user_id: string;
    expires_at: string | null;
    created_at: string;
    // Joins
    subject?: Subject;
    student?: Profile;
}

export interface Organization {
    id: string;
    name_ar: string;
    name_en: string | null;
    is_active: boolean;
    created_at: string;
    updated_at: string;
}

export interface OrgMember {
    id: string;
    organization_id: string;
    student_id: string;
    status: 'active' | 'inactive';
    created_at: string;
}

export interface OrgSubject {
    id: string;
    organization_id: string;
    subject_id: string;
    status: 'active' | 'inactive';
    created_at: string;
}

export interface Coupon {
    id: string;
    code: string;
    discount_type: 'percent' | 'fixed';
    discount_value: number;
    max_redemptions: number | null;
    redeemed_count: number;
    starts_at: string | null;
    ends_at: string | null;
    applies_to: 'plan' | 'subject';
    plan_id: string | null;
    subject_id: string | null;
    is_active: boolean;
    created_at: string;
}

export interface CouponRedemption {
    id: string;
    coupon_id: string;
    user_id: string;
    subscription_id: string | null;
    redeemed_at: string;
}

/** Returned by get_student_subjects RPC — subject with entitlement metadata */
export interface EntitledSubject extends Subject {
    entitlement_reason: string;
    stage_title_ar?: string;
    stage_title_en?: string;
    total_lessons?: number;
    completed_lessons?: number;
    progress_percent?: number;
}

/** Returned by get_discover_subjects RPC — locked subject with lock reason */
export interface DiscoverSubject {
    id: string;
    title_ar: string;
    title_en: string | null;
    description_ar: string | null;
    description_en: string | null;
    slug: string | null;
    stage_id: string | null;
    access_type: SubjectAccessType;
    sort_order: number;
    show_on_home: boolean;
    teaser_ar: string | null;
    teaser_en: string | null;
    lock_reason: string;
    stage_title_ar: string | null;
    stage_title_en: string | null;
}

// Announcement (bilingual)
export interface Announcement {
    id: string;
    teacher_id: string;
    subject_id: string | null;
    title_ar: string;
    title_en: string | null;
    body_ar: string | null;
    body_en: string | null;
    is_active: boolean;
    created_at: string;
    updated_at?: string;
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
            ratings: {
                Row: Rating;
                Insert: Partial<Rating>;
                Update: Partial<Rating>;
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
            quizzes: {
                Row: Quiz;
                Insert: Partial<Quiz>;
                Update: Partial<Quiz>;
            };
            quiz_questions: {
                Row: QuizQuestion;
                Insert: Partial<QuizQuestion>;
                Update: Partial<QuizQuestion>;
            };
            quiz_options: {
                Row: QuizOption;
                Insert: Partial<QuizOption>;
                Update: Partial<QuizOption>;
            };
            quiz_attempts: {
                Row: QuizAttempt;
                Insert: Partial<QuizAttempt>;
                Update: Partial<QuizAttempt>;
            };
            templates: {
                Row: Template;
                Insert: Partial<Template>;
                Update: Partial<Template>;
            };
            certificates: {
                Row: Certificate;
                Insert: Partial<Certificate>;
                Update: Partial<Certificate>;
            };
            certificate_rules: {
                Row: CertificateRule;
                Insert: Partial<CertificateRule>;
                Update: Partial<CertificateRule>;
            };
            student_subjects: {
                Row: StudentSubject;
                Insert: Partial<StudentSubject>;
                Update: Partial<StudentSubject>;
            };
            plans: {
                Row: Plan;
                Insert: Partial<Plan>;
                Update: Partial<Plan>;
            };
            plan_subjects: {
                Row: PlanSubject;
                Insert: Partial<PlanSubject>;
                Update: Partial<PlanSubject>;
            };
            subscriptions: {
                Row: Subscription;
                Insert: Partial<Subscription>;
                Update: Partial<Subscription>;
            };
            family_members: {
                Row: FamilyMember;
                Insert: Partial<FamilyMember>;
                Update: Partial<FamilyMember>;
            };
            subject_invites: {
                Row: SubjectInvite;
                Insert: Partial<SubjectInvite>;
                Update: Partial<SubjectInvite>;
            };
            organizations: {
                Row: Organization;
                Insert: Partial<Organization>;
                Update: Partial<Organization>;
            };
            org_members: {
                Row: OrgMember;
                Insert: Partial<OrgMember>;
                Update: Partial<OrgMember>;
            };
            org_subjects: {
                Row: OrgSubject;
                Insert: Partial<OrgSubject>;
                Update: Partial<OrgSubject>;
            };
            coupons: {
                Row: Coupon;
                Insert: Partial<Coupon>;
                Update: Partial<Coupon>;
            };
            coupon_redemptions: {
                Row: CouponRedemption;
                Insert: Partial<CouponRedemption>;
                Update: Partial<CouponRedemption>;
            };
            announcements: {
                Row: Announcement;
                Insert: Partial<Announcement>;
                Update: Partial<Announcement>;
            };
            orders: {
                Row: Order;
                Insert: Partial<Order>;
                Update: Partial<Order>;
            };
            teacher_applications: {
                Row: TeacherApplication;
                Insert: Partial<TeacherApplication>;
                Update: Partial<TeacherApplication>;
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
            request_certificate: {
                Args: { p_subject_id: string };
                Returns: Record<string, unknown>;
            };
            admin_reissue_certificate: {
                Args: { p_certificate_id: string; p_reason?: string };
                Returns: Record<string, unknown>;
            };
            admin_approve_certificate: {
                Args: { p_certificate_id: string };
                Returns: Record<string, unknown>;
            };
            admin_revoke_certificate: {
                Args: { p_certificate_id: string };
                Returns: Record<string, unknown>;
            };
            get_student_subjects: {
                Args: { p_student_id: string };
                Returns: EntitledSubject[];
            };
            get_discover_subjects: {
                Args: { p_student_id: string };
                Returns: DiscoverSubject[];
            };
            check_subject_access: {
                Args: { p_student_id: string; p_subject_id: string };
                Returns: { has_access: boolean; reason: string; access_type?: string };
            };
        };
    };
};
