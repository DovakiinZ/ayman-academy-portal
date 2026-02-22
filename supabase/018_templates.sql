-- ==============================================================================
-- 018 TOKEN-BASED TEMPLATE SYSTEM
-- Creates the templates table for admin-managed, token-interpolated content
-- ==============================================================================

-- 1. Create templates table
CREATE TABLE IF NOT EXISTS public.templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key TEXT UNIQUE NOT NULL,
    title_ar TEXT NOT NULL,
    title_en TEXT NOT NULL DEFAULT '',
    description TEXT,
    type TEXT NOT NULL CHECK (type IN ('certificate','message','email','page_block')),
    content_ar TEXT NOT NULL DEFAULT '',
    content_en TEXT NOT NULL DEFAULT '',
    variables JSONB NOT NULL DEFAULT '[]'::jsonb,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Optional render logs for auditing
CREATE TABLE IF NOT EXISTS public.template_render_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    template_id UUID NOT NULL REFERENCES public.templates(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. Indexes
CREATE INDEX IF NOT EXISTS idx_templates_type ON public.templates(type);
CREATE INDEX IF NOT EXISTS idx_templates_key ON public.templates(key);
CREATE INDEX IF NOT EXISTS idx_template_render_logs_template ON public.template_render_logs(template_id);

-- 4. RLS
ALTER TABLE public.templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.template_render_logs ENABLE ROW LEVEL SECURITY;

-- super_admin: full CRUD on templates
DROP POLICY IF EXISTS "super_admin_templates_all" ON public.templates;
CREATE POLICY "super_admin_templates_all" ON public.templates
    FOR ALL
    USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin')
    )
    WITH CHECK (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin')
    );

-- students: can read active templates
DROP POLICY IF EXISTS "students_read_active_templates" ON public.templates;
CREATE POLICY "students_read_active_templates" ON public.templates
    FOR SELECT
    USING (is_active = true);

-- super_admin: full on render logs
DROP POLICY IF EXISTS "super_admin_render_logs_all" ON public.template_render_logs;
CREATE POLICY "super_admin_render_logs_all" ON public.template_render_logs
    FOR ALL
    USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin')
    );

-- users can see their own render logs
DROP POLICY IF EXISTS "users_own_render_logs" ON public.template_render_logs;
CREATE POLICY "users_own_render_logs" ON public.template_render_logs
    FOR SELECT
    USING (user_id = auth.uid());

-- 5. Seed data: certificate + welcome message
INSERT INTO public.templates (key, title_ar, title_en, description, type, content_ar, content_en, variables) VALUES
(
    'certificate.subject_completion',
    'شهادة إتمام مادة',
    'Subject Completion Certificate',
    'Certificate awarded when a student completes all lessons in a subject',
    'certificate',
    'تشهد أكاديمية أيمن بأن الطالب {{student_name}} قد أتم مادة {{subject_name}} للمرحلة {{stage_name}} بتاريخ {{date}}.',
    'Ayman Academy certifies that {{student_name}} has completed the subject {{subject_name}} for stage {{stage_name}} on {{date}}.',
    '[
        {"token":"student_name","label_ar":"اسم الطالب","label_en":"Student Name"},
        {"token":"subject_name","label_ar":"اسم المادة","label_en":"Subject Name"},
        {"token":"stage_name","label_ar":"اسم المرحلة","label_en":"Stage Name"},
        {"token":"date","label_ar":"التاريخ","label_en":"Date"},
        {"token":"academy_name","label_ar":"اسم الأكاديمية","label_en":"Academy Name"}
    ]'::jsonb
),
(
    'student.welcome',
    'رسالة ترحيب',
    'Welcome Message',
    'Welcome message sent to new students',
    'message',
    'مرحباً {{student_name}}! أهلاً بك في أكاديمية أيمن. نتمنى لك رحلة تعليمية ممتعة ومفيدة.',
    'Welcome {{student_name}}! Welcome to Ayman Academy. We wish you an enjoyable and beneficial learning journey.',
    '[
        {"token":"student_name","label_ar":"اسم الطالب","label_en":"Student Name"},
        {"token":"academy_name","label_ar":"اسم الأكاديمية","label_en":"Academy Name"}
    ]'::jsonb
),
(
    'certificate.lesson_completion',
    'شهادة إتمام درس',
    'Lesson Completion Certificate',
    'Certificate for completing a specific lesson',
    'certificate',
    'تشهد أكاديمية أيمن بأن الطالب {{student_name}} قد أتم درس {{lesson_name}} في مادة {{subject_name}} بنجاح بتاريخ {{date}} بدرجة {{score}}.',
    'Ayman Academy certifies that {{student_name}} has successfully completed the lesson {{lesson_name}} in {{subject_name}} on {{date}} with a score of {{score}}.',
    '[
        {"token":"student_name","label_ar":"اسم الطالب","label_en":"Student Name"},
        {"token":"lesson_name","label_ar":"اسم الدرس","label_en":"Lesson Name"},
        {"token":"subject_name","label_ar":"اسم المادة","label_en":"Subject Name"},
        {"token":"date","label_ar":"التاريخ","label_en":"Date"},
        {"token":"score","label_ar":"الدرجة","label_en":"Score"},
        {"token":"teacher_name","label_ar":"اسم المعلم","label_en":"Teacher Name"}
    ]'::jsonb
),
(
    'message.lesson_reminder',
    'تذكير بالدرس',
    'Lesson Reminder',
    'Reminder message for upcoming lessons',
    'message',
    'مرحباً {{student_name}}، لا تنسَ إكمال درس {{lesson_name}} في مادة {{subject_name}}. حظاً موفقاً!',
    'Hello {{student_name}}, don''t forget to complete the lesson {{lesson_name}} in {{subject_name}}. Good luck!',
    '[
        {"token":"student_name","label_ar":"اسم الطالب","label_en":"Student Name"},
        {"token":"lesson_name","label_ar":"اسم الدرس","label_en":"Lesson Name"},
        {"token":"subject_name","label_ar":"اسم المادة","label_en":"Subject Name"}
    ]'::jsonb
)
ON CONFLICT (key) DO NOTHING;
