-- 1. Create ENUMs if missing (Defensive)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'student_gender') THEN
        CREATE TYPE student_gender AS ENUM ('male', 'female', 'unspecified');
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'student_stage') THEN
        CREATE TYPE student_stage AS ENUM ('primary', 'middle', 'high');
    END IF;
END $$;

-- 2. Add 'kindergarten' to student_stage ENUM if missing
ALTER TYPE student_stage ADD VALUE IF NOT EXISTS 'kindergarten' BEFORE 'primary';

-- 3. Ensure onboarding columns exist in profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS gender student_gender DEFAULT 'unspecified';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS student_stage student_stage;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS grade int;

-- 4. Ensure 'high' (Secondary School) exists in the stages table
INSERT INTO public.stages (
    slug, 
    title_ar, 
    title_en, 
    description_ar, 
    description_en, 
    sort_order, 
    is_active, 
    show_on_home, 
    home_order, 
    teaser_ar, 
    teaser_en
)
VALUES (
    'high', 
    'المرحلة الثانوية', 
    'Secondary Stage', 
    'التحضير للتعليم الجامعي واختبارات القدرات والتحصيلي. يركز البرنامج على المواد التخصصية (علمي/أدبي) وتطوير المهارات الأكاديمية المتقدمة.', 
    'Preparation for university education and aptitude tests. The program focuses on specialized subjects (Science/Arts) and developing advanced academic skills.',
    4, true, true, 4,
    'التحضير للمستقبل والجامعة بأفضل المناهج',
    'Preparing for the future and university with the best curricula'
)
ON CONFLICT (slug) DO UPDATE 
SET 
  title_ar = EXCLUDED.title_ar,
  title_en = EXCLUDED.title_en,
  description_ar = EXCLUDED.description_ar,
  description_en = EXCLUDED.description_en,
  is_active = EXCLUDED.is_active,
  show_on_home = EXCLUDED.show_on_home;

-- 5. Update grade constraint to allow 0 (for Kindergarten)
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_grade_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_grade_check
    CHECK (grade IS NULL OR (grade >= 0 AND grade <= 12));
