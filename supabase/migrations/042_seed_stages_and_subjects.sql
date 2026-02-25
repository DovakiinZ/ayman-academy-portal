-- ==============================================================================
-- 042 SEED STAGES AND SUBJECTS
-- Populates the database with initial educational stages and subjects
-- ==============================================================================

-- 1. Insert Stages
INSERT INTO public.stages (slug, title_ar, title_en, description_ar, description_en, sort_order, is_active, show_on_home, home_order, teaser_ar, teaser_en)
VALUES 
  (
    'kindergarten', 
    'رياض الأطفال', 
    'Kindergarten', 
    'أساسيات التعلم المبكر وتنمية المهارات الأولية للأطفال من 4-6 سنوات. يركز هذا البرنامج على بناء الأسس الأولى للقراءة والكتابة والحساب بطرق تفاعلية ومناسبة للفئة العمرية.', 
    'Early learning fundamentals and initial skills development for children aged 4-6. This program focuses on building the first foundations of reading, writing, and arithmetic through interactive and age-appropriate methods.',
    1, true, true, 1,
    'تنمية مهارات الطفل المبكرة بطرق تفاعلية',
    'Developing early childhood skills interactively'
  ),
  (
    'primary', 
    'المرحلة الابتدائية', 
    'Primary Stage', 
    'بناء الأساس المعرفي المتين في العلوم واللغات والرياضيات. منهج شامل يغطي الصفوف من الأول إلى السادس الابتدائي مع تركيز على المهارات الأساسية والتفكير النقدي.', 
    'Building a solid foundation in sciences, languages, and mathematics. A comprehensive curriculum covering grades 1-6 with emphasis on fundamental skills and critical thinking.',
    2, true, true, 2,
    'بناء أساس معرفي متين وشامل',
    'Building a solid and comprehensive knowledge foundation'
  ),
  (
    'middle', 
    'المرحلة المتوسطة', 
    'Middle School', 
    'تطوير المهارات التحليلية والإبداعية والاستعداد للمراحل المتقدمة. يشمل هذا البرنامج مواد متقدمة تؤهل الطلاب للمرحلة الثانوية والتعليم العالي.', 
    'Developing analytical and creative skills in preparation for advanced stages. This program includes advanced subjects that prepare students for high school and higher education.',
    3, true, true, 3,
    'تطوير المهارات التحليلية والإبداعية',
    'Developing analytical and creative skills'
  )
ON CONFLICT (slug) DO UPDATE 
SET 
  title_ar = EXCLUDED.title_ar,
  title_en = EXCLUDED.title_en,
  description_ar = EXCLUDED.description_ar,
  description_en = EXCLUDED.description_en,
  is_active = EXCLUDED.is_active,
  show_on_home = EXCLUDED.show_on_home;

-- 2. Insert Sample Subjects
DO $$ 
DECLARE
    kg_id UUID;
    primary_id UUID;
    middle_id UUID;
BEGIN
    SELECT id INTO kg_id FROM public.stages WHERE slug = 'kindergarten';
    SELECT id INTO primary_id FROM public.stages WHERE slug = 'primary';
    SELECT id INTO middle_id FROM public.stages WHERE slug = 'middle';

    -- KG Subjects
    INSERT INTO public.subjects (stage_id, slug, title_ar, title_en, description_ar, sort_order, is_active, show_on_home, home_order)
    VALUES 
      (kg_id, 'arabic-kg', 'اللغة العربية', 'Arabic', 'تأسيس القراءة والكتابة', 1, true, true, 1),
      (kg_id, 'math-kg', 'الحساب', 'Mathematics', 'أساسيات الأرقام والعد', 2, true, true, 2)
    ON CONFLICT (stage_id, slug) DO NOTHING;

    -- Primary Subjects
    INSERT INTO public.subjects (stage_id, slug, title_ar, title_en, description_ar, sort_order, is_active, show_on_home, home_order)
    VALUES 
      (primary_id, 'arabic-primary', 'اللغة العربية', 'Arabic', 'مهارات لغوية متقدمة', 1, true, true, 3),
      (primary_id, 'math-primary', 'الرياضيات', 'Mathematics', 'العمليات الحسابية والهندسة', 2, true, true, 4)
    ON CONFLICT (stage_id, slug) DO NOTHING;

    -- Middle Subjects
    INSERT INTO public.subjects (stage_id, slug, title_ar, title_en, description_ar, sort_order, is_active, show_on_home, home_order)
    VALUES 
      (middle_id, 'science-middle', 'العلوم', 'Science', 'اكتشاف الظواهر الطبيعية', 1, true, false, 0),
      (middle_id, 'english-middle', 'اللغة الإنجليزية', 'English', 'تطوير مهارات المحادثة', 2, true, false, 0)
    ON CONFLICT (stage_id, slug) DO NOTHING;
END $$;
