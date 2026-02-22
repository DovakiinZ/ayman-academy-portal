-- Create system_settings table
CREATE TABLE IF NOT EXISTS public.system_settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  description TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by UUID REFERENCES public.profiles(id)
);

-- Enable RLS
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

-- Policies
-- Everyone can read settings (public/anon/authenticated)
CREATE POLICY "settings_read_all" ON public.system_settings
  FOR SELECT USING (true);

-- Only super_admin can modify
CREATE POLICY "settings_admin_modify" ON public.system_settings
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'super_admin')
  );

-- Seed Data (Upsert to strictly enforce these keys)
INSERT INTO public.system_settings (key, value, description) VALUES
  ('ui.default_language', '"ar"', 'Default application language (ar/en)'),
  ('ui.enable_ratings', 'true', 'Enable/disable rating system globally'),
  ('ui.enable_comments', 'true', 'Enable/disable comment system globally'),
  ('home.show_featured_teachers', 'true', 'Show featured teachers section on home page'),
  ('home.show_featured_subjects', 'true', 'Show featured subjects section on home page'),
  ('home.show_featured_lessons', 'true', 'Show featured lessons section on home page'),
  ('completion.certificate_threshold_percent', '90', 'Percentage required to issue a certificate'),
  ('completion.lesson_complete_percent', '90', 'Percentage video watched to mark lesson as complete'),
  ('paywall.allow_free_preview', 'true', 'Allow free previews for non-subscribers'),
  ('paywall.free_preview_per_teacher_count', '3', 'Number of free previews allowed per teacher')
ON CONFLICT (key) DO UPDATE SET
  value = EXCLUDED.value,
  description = EXCLUDED.description;
