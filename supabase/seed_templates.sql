-- Seed initial content templates
-- This script safely inserts or updates the default templates

INSERT INTO content_templates (key, category, content_ar, content_en, description, type, is_public)
VALUES
    -- Home Page Hero
    ('home.hero.brow', 'home', 'أكاديمية تعليمية', 'Educational Academy', 'Hero section eyebrow text', 'plain', true),
    ('home.hero.title', 'home', 'تعليم أكاديمي متميز', 'Premium Academic Education', 'Hero section main title', 'plain', true),
    ('home.hero.desc', 'home', 'منهج تعليمي متكامل يجمع بين الأساليب الأكاديمية الحديثة والقيم التربوية الراسخة.', 'A comprehensive curriculum combining modern academic methods with established educational values.', 'Hero section description paragraph', 'plain', true),
    ('home.hero.cta', 'home', 'استعرض المراحل', 'Explore Stages', 'Primary Call to Action button text', 'plain', true),
    ('home.hero.subcta', 'home', 'معلومات الاشتراك', 'Subscription Info', 'Secondary Call to Action link text', 'plain', true),

    -- Stages Page
    ('stages.page.title', 'stages', 'المراحل الدراسية', 'Educational Stages', 'Main title for the Stages page', 'plain', true),
    ('stages.page.subtitle', 'stages', 'اختر المرحلة الدراسية المناسبة للوصول إلى المواد والدروس التعليمية', 'Select the appropriate educational stage to access subjects and lessons', 'Subtitle for the Stages page', 'plain', true),

    -- Paywall
    ('paywall.access_denied.title', 'paywall', 'عفواً، لا يمكنك الوصول لهذا الدرس', 'Access Denied', 'Title shown when user hits a paywall', 'plain', true),
    ('paywall.access_denied.message', 'paywall', 'يجب الاشتراك للوصول لهذا الدرس', 'You must subscribe to access this lesson', 'Message shown explaining why access is denied', 'plain', true),
    ('paywall.back_btn', 'paywall', 'العودة للمراحل', 'Back to Stages', 'Button text to return to stages', 'plain', true)

ON CONFLICT (key) DO UPDATE SET
    content_ar = EXCLUDED.content_ar,
    content_en = EXCLUDED.content_en,
    description = EXCLUDED.description,
    category = EXCLUDED.category;
